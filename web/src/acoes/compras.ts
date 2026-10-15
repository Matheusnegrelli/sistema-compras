"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { registrarLog } from "@/lib/log";
import { sincronizarEstoque } from "@/lib/sincronizacao";
import { registrarEntrada, simularConsumo } from "@/lib/estoque-api";
import { simularPropostas } from "@/lib/simulacao";
import { classificarPropostas, notaDaEntrega } from "@/lib/pontuacao";
import { obterPesos } from "@/lib/consultas";
import { abrirCotacao, enviarSolicitacoes, obterConfiguracaoEnvio } from "@/lib/solicitacoes";
import { falhar, numero, sucesso, texto } from "./util";

// ---------- Integração com o estoque ----------
export async function sincronizarAgora(fd: FormData) {
  const sessao = await exigirSessao();
  const volta = texto(fd, "volta") || "/necessidades";
  const r = await sincronizarEstoque("MANUAL", sessao.id);
  revalidatePath("/", "layout");
  if (!r.sucesso) falhar(volta, `Falha ao consultar a API de estoque: ${r.erro}`);
  const envio = r.cotacoesEnviadas > 0 ? `, ${r.cotacoesEnviadas} cotação(ões) enviada(s) aos fornecedores` : "";
  sucesso(volta, `Estoque sincronizado: ${r.itensLidos} itens lidos, ${r.alertasGerados} novo(s) alerta(s)${envio} em ${r.duracaoMs} ms`);
}

export async function simularConsumoEstoque() {
  const sessao = await exigirSessao();
  try {
    const r = await simularConsumo();
    await registrarLog(sessao.id, "CONSUMO_SIMULADO", "Estoque", null, `${r.alterados.length} itens com saída`);
  } catch (e) {
    falhar("/integracao", e instanceof Error ? e.message : "Falha na API");
  }
  sucesso("/integracao", "Consumo simulado na API de estoque. Clique em Sincronizar para detectar os alertas.");
}

// ---------- Necessidades de compra ----------
export async function criarNecessidadeManual(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const produtoId = Number(fd.get("produtoId"));
  const quantidade = numero(fd, "quantidade");
  if (!produtoId || !Number.isInteger(quantidade) || quantidade <= 0) falhar("/necessidades", "Selecione o produto e a quantidade");
  const produto = await prisma.produto.findUniqueOrThrow({ where: { id: produtoId } });
  const aberta = await prisma.necessidadeCompra.findFirst({ where: { produtoId, status: { in: ["ABERTA", "EM_COTACAO"] } } });
  if (aberta) falhar("/necessidades", `${produto.sku} já tem uma necessidade em aberto`);
  const n = await prisma.necessidadeCompra.create({
    data: { produtoId, quantidade, estoqueNoMomento: produto.estoqueAtual, estoqueMinimo: produto.estoqueMinimo, origem: "MANUAL" },
  });
  await registrarLog(sessao.id, "NECESSIDADE_MANUAL", "NecessidadeCompra", n.id, `${produto.sku} x${quantidade}`);
  if ((await obterConfiguracaoEnvio()).envioAutomatico) {
    const { cotacao, enviados } = await abrirCotacao(n.id, sessao.id);
    sucesso(`/cotacoes/${cotacao.id}`, `Necessidade registrada, cotação aberta e enviada a ${enviados} fornecedor(es)`);
  }
  sucesso("/necessidades", "Necessidade registrada");
}

export async function cancelarNecessidade(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const id = Number(fd.get("id"));
  const necessidade = await prisma.necessidadeCompra.findUnique({ where: { id } });
  if (!necessidade || !["ABERTA", "EM_COTACAO"].includes(necessidade.status)) falhar("/necessidades", "Esta necessidade não está mais em aberto");
  await prisma.necessidadeCompra.update({ where: { id }, data: { status: "CANCELADA" } });
  await prisma.cotacao.updateMany({ where: { necessidadeId: id, status: "ABERTA" }, data: { status: "CANCELADA", encerradaEm: new Date() } });
  await registrarLog(sessao.id, "NECESSIDADE_CANCELADA", "NecessidadeCompra", id);
  sucesso("/necessidades", "Necessidade cancelada");
}

export async function gerarCotacao(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const necessidadeId = Number(fd.get("necessidadeId"));
  const necessidade = await prisma.necessidadeCompra.findUnique({ where: { id: necessidadeId }, include: { cotacao: true } });
  if (!necessidade) falhar("/necessidades", "Necessidade não encontrada");
  if (necessidade.cotacao && necessidade.cotacao.status !== "CANCELADA") redirect(`/cotacoes/${necessidade.cotacao.id}`);
  if (necessidade.status !== "ABERTA") falhar("/necessidades", "Esta necessidade não está mais em aberto");
  const { cotacao, enviados } = await abrirCotacao(necessidadeId, sessao.id);
  revalidatePath("/", "layout");
  sucesso(`/cotacoes/${cotacao.id}`, `Cotação aberta e pedido enviado a ${enviados} fornecedor(es)`);
}

export async function reenviarCotacao(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const cotacaoId = Number(fd.get("cotacaoId"));
  await cotacaoAberta(cotacaoId);
  const enviados = await enviarSolicitacoes(cotacaoId, sessao.id);
  if (enviados === 0) falhar(`/cotacoes/${cotacaoId}`, "Todos os fornecedores ativos com e-mail já receberam o pedido");
  sucesso(`/cotacoes/${cotacaoId}`, `Pedido enviado a mais ${enviados} fornecedor(es)`);
}

// ---------- Propostas ----------
async function cotacaoAberta(id: number) {
  const c = await prisma.cotacao.findUnique({ where: { id }, include: { necessidade: { include: { produto: true } } } });
  if (!c) falhar("/cotacoes", "Cotação não encontrada");
  if (c.status !== "ABERTA") falhar(`/cotacoes/${id}`, "Esta cotação já foi encerrada");
  return c;
}

export async function adicionarProposta(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const cotacaoId = Number(fd.get("cotacaoId"));
  const volta = `/cotacoes/${cotacaoId}`;
  await cotacaoAberta(cotacaoId);
  const fornecedorId = Number(fd.get("fornecedorId"));
  const preco = numero(fd, "precoUnitario");
  const prazo = numero(fd, "prazoEntregaDias");
  const disponivel = numero(fd, "quantidadeDisponivel");
  const minima = numero(fd, "quantidadeMinima");
  if (!fornecedorId) falhar(volta, "Selecione o fornecedor");
  if (!(preco > 0)) falhar(volta, "Preço unitário deve ser maior que zero");
  if (!Number.isInteger(prazo) || prazo < 0) falhar(volta, "Prazo de entrega inválido");
  if (!Number.isInteger(disponivel) || disponivel < 0) falhar(volta, "Quantidade disponível inválida");
  const dados = {
    precoUnitario: preco,
    prazoEntregaDias: prazo,
    quantidadeDisponivel: disponivel,
    quantidadeMinima: Number.isInteger(minima) && minima > 0 ? minima : 1,
    observacao: texto(fd, "observacao") || null,
    origem: "MANUAL" as const,
  };
  const p = await prisma.proposta.upsert({
    where: { cotacaoId_fornecedorId: { cotacaoId, fornecedorId } },
    create: { cotacaoId, fornecedorId, ...dados },
    update: dados,
  });
  await prisma.solicitacaoCotacao.updateMany({ where: { cotacaoId, fornecedorId, respondidoEm: null }, data: { respondidoEm: new Date() } });
  await registrarLog(sessao.id, "PROPOSTA_REGISTRADA", "Proposta", p.id, `Cotação #${cotacaoId}, R$ ${preco}, ${prazo} dias`);
  sucesso(volta, "Proposta registrada");
}

export async function removerProposta(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const id = Number(fd.get("id"));
  const p = await prisma.proposta.findUniqueOrThrow({ where: { id } });
  await cotacaoAberta(p.cotacaoId);
  await prisma.proposta.delete({ where: { id } });
  await registrarLog(sessao.id, "PROPOSTA_REMOVIDA", "Proposta", id);
  sucesso(`/cotacoes/${p.cotacaoId}`, "Proposta removida");
}

/** Demonstração: simula os fornecedores convidados respondendo pelo link da cotação. */
export async function simularPropostasCotacao(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const cotacaoId = Number(fd.get("cotacaoId"));
  const c = await cotacaoAberta(cotacaoId);
  const pendentes = await prisma.solicitacaoCotacao.findMany({ where: { cotacaoId, respondidoEm: null }, include: { fornecedor: true } });
  // Cotações antigas, sem pedido enviado, simulam todos os fornecedores ativos que ainda não responderam
  const jaResponderam = await prisma.proposta.findMany({ where: { cotacaoId }, select: { fornecedorId: true } });
  const fornecedores = (await prisma.solicitacaoCotacao.count({ where: { cotacaoId } })) > 0
    ? pendentes.map((s) => s.fornecedor)
    : await prisma.fornecedor.findMany({ where: { ativo: true, id: { notIn: jaResponderam.map((p) => p.fornecedorId) } } });
  if (fornecedores.length === 0) falhar(`/cotacoes/${cotacaoId}`, "Todos os fornecedores convidados já responderam");
  const propostas = simularPropostas(fornecedores, c.necessidade.quantidade, c.necessidade.produto.precoReferencia ?? 50);
  await prisma.proposta.createMany({ data: propostas.map((p) => ({ ...p, cotacaoId })), skipDuplicates: true });
  await prisma.solicitacaoCotacao.updateMany({
    where: { cotacaoId, fornecedorId: { in: propostas.map((p) => p.fornecedorId) } },
    data: { respondidoEm: new Date(), visualizadoEm: new Date() },
  });
  await registrarLog(sessao.id, "PROPOSTAS_SIMULADAS", "Cotacao", cotacaoId, `${propostas.length} fornecedores`);
  sucesso(`/cotacoes/${cotacaoId}`, `${propostas.length} fornecedor(es) responderam (simulação)`);
}

// ---------- Decisão do gestor (a decisão final é sempre humana) ----------
export async function aprovarProposta(fd: FormData) {
  const sessao = await exigirSessao("GESTOR");
  const cotacaoId = Number(fd.get("cotacaoId"));
  const propostaId = Number(fd.get("propostaId"));
  const justificativa = texto(fd, "justificativa");
  const volta = `/cotacoes/${cotacaoId}`;
  const c = await cotacaoAberta(cotacaoId);
  const propostas = await prisma.proposta.findMany({ where: { cotacaoId }, include: { fornecedor: true } });
  const pesos = await obterPesos();
  const ranking = classificarPropostas(
    propostas.map((p) => ({
      id: p.id,
      fornecedor: p.fornecedor.nome,
      precoUnitario: p.precoUnitario,
      prazoEntregaDias: p.prazoEntregaDias,
      quantidadeDisponivel: p.quantidadeDisponivel,
      quantidadeMinima: p.quantidadeMinima,
      notaHistorico: p.fornecedor.notaHistorico,
    })),
    c.necessidade.quantidade,
    pesos,
  );
  const escolhida = ranking.find((r) => r.id === propostaId);
  if (!escolhida) falhar(volta, "Proposta não encontrada");
  const seguiu = escolhida.posicao === 1;
  if (!seguiu && justificativa.length < 5) {
    falhar(volta, "Informe uma justificativa ao escolher uma proposta diferente da recomendada");
  }
  await prisma.$transaction([
    prisma.decisao.create({
      data: {
        cotacaoId,
        propostaId,
        gestorId: sessao.id,
        pontuacao: escolhida.pontuacao,
        ranking: ranking as unknown as Prisma.InputJsonValue,
        pesos,
        seguiuRecomendacao: seguiu,
        justificativa: justificativa || null,
      },
    }),
    prisma.cotacao.update({ where: { id: cotacaoId }, data: { status: "APROVADA", encerradaEm: new Date() } }),
    prisma.necessidadeCompra.update({ where: { id: c.necessidadeId }, data: { status: "ATENDIDA" } }),
  ]);
  await registrarLog(sessao.id, "COMPRA_APROVADA", "Cotacao", cotacaoId,
    `${escolhida.fornecedor} (${escolhida.pontuacao} pts, ${seguiu ? "recomendada" : "diferente da recomendada"})`);
  revalidatePath("/", "layout");
  sucesso(volta, "Compra aprovada e registrada no histórico");
}

export async function cancelarCotacao(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const id = Number(fd.get("cotacaoId"));
  const c = await cotacaoAberta(id);
  await prisma.$transaction([
    prisma.cotacao.update({ where: { id }, data: { status: "CANCELADA", encerradaEm: new Date() } }),
    prisma.necessidadeCompra.update({ where: { id: c.necessidadeId }, data: { status: "ABERTA" } }),
  ]);
  await registrarLog(sessao.id, "COTACAO_CANCELADA", "Cotacao", id);
  sucesso("/cotacoes", "Cotação cancelada; a necessidade voltou para aberta");
}

/** Registra o recebimento: atualiza o histórico do fornecedor e dá entrada na API de estoque. */
export async function registrarRecebimento(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const cotacaoId = Number(fd.get("cotacaoId"));
  const volta = `/cotacoes/${cotacaoId}`;
  const avaliacao = numero(fd, "avaliacao");
  const noPrazo = fd.get("entregueNoPrazo") === "sim";
  if (!Number.isInteger(avaliacao) || avaliacao < 1 || avaliacao > 5) falhar(volta, "Avalie a entrega de 1 a 5");
  const decisao = await prisma.decisao.findUnique({
    where: { cotacaoId },
    include: { proposta: true, cotacao: { include: { necessidade: { include: { produto: true } } } } },
  });
  if (!decisao) falhar(volta, "Esta cotação ainda não foi aprovada");
  if (decisao.recebidoEm) falhar(volta, "Recebimento já registrado");

  await prisma.decisao.update({ where: { id: decisao.id }, data: { recebidoEm: new Date(), entregueNoPrazo: noPrazo, avaliacao } });

  // Recalcula a nota do fornecedor como média acumulada: a nota atual já representa a nota
  // inicial do cadastro mais as entregas avaliadas antes desta
  const fornecedorId = decisao.proposta.fornecedorId;
  const avaliacoesAnteriores = await prisma.decisao.count({
    where: { proposta: { fornecedorId }, avaliacao: { not: null }, NOT: { id: decisao.id } },
  });
  const fornecedor = await prisma.fornecedor.findUniqueOrThrow({ where: { id: fornecedorId } });
  const pesoAtual = avaliacoesAnteriores + 1;
  const novaNota = Math.round(((fornecedor.notaHistorico * pesoAtual + notaDaEntrega(avaliacao, noPrazo)) / (pesoAtual + 1)) * 100) / 100;
  await prisma.fornecedor.update({ where: { id: fornecedorId }, data: { notaHistorico: novaNota } });

  const produto = decisao.cotacao.necessidade.produto;
  const quantidade = Math.max(
    Math.min(decisao.cotacao.necessidade.quantidade, decisao.proposta.quantidadeDisponivel),
    decisao.proposta.quantidadeMinima,
  );
  let msgEstoque = "";
  try {
    await registrarEntrada(produto.sku, quantidade, `Recebimento da cotação #${cotacaoId}`);
    await sincronizarEstoque("AUTOMATICA", sessao.id);
    msgEstoque = ` Entrada de ${quantidade} ${produto.unidade} enviada à API de estoque.`;
  } catch {
    msgEstoque = " Não foi possível dar entrada na API de estoque.";
  }
  await registrarLog(sessao.id, "RECEBIMENTO", "Cotacao", cotacaoId, `Avaliação ${avaliacao}, ${noPrazo ? "no prazo" : "com atraso"}; nota do fornecedor ${novaNota}`);
  revalidatePath("/", "layout");
  sucesso(volta, `Recebimento registrado. Nova nota do fornecedor: ${novaNota}.${msgEstoque}`);
}
