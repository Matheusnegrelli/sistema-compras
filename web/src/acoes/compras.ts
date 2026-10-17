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
import { classificarPropostas, notaDaEntrega, quantidadeCompra } from "@/lib/pontuacao";
import { obterPesos, paraAlgoritmo } from "@/lib/consultas";
import { enviarPedidoCompra, enviarResumoAoComprador, avisarPagamentoAoFornecedor } from "@/lib/pedido";
import { formaValida } from "@/lib/pagamento";
import { lerItensDoFormulario, registrarSemItens, salvarProposta } from "@/lib/propostas";
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
    const { cotacao, enviados, itens } = await abrirCotacao(produto.categoria, sessao.id);
    sucesso(`/cotacoes/${cotacao.id}`, `Necessidade registrada; cotação de ${produto.categoria} (${itens} item(ns)) enviada a ${enviados} fornecedor(es)`);
  }
  sucesso("/necessidades", "Necessidade registrada");
}

export async function cancelarNecessidade(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const id = Number(fd.get("id"));
  const necessidade = await prisma.necessidadeCompra.findUnique({ where: { id }, include: { cotacao: { include: { _count: { select: { itens: true } } } } } });
  if (!necessidade || !["ABERTA", "EM_COTACAO"].includes(necessidade.status)) falhar("/necessidades", "Esta necessidade não está mais em aberto");
  await prisma.$transaction(async (tx) => {
    await tx.itemProposta.deleteMany({ where: { necessidadeId: id } });
    await tx.necessidadeCompra.update({ where: { id }, data: { status: "CANCELADA" } });
    // Se era o único item de uma cotação aberta, a cotação também é cancelada
    const c = necessidade.cotacao;
    if (c && c.status === "ABERTA" && c._count.itens <= 1) {
      await tx.cotacao.update({ where: { id: c.id }, data: { status: "CANCELADA", encerradaEm: new Date() } });
    }
  });
  await registrarLog(sessao.id, "NECESSIDADE_CANCELADA", "NecessidadeCompra", id);
  sucesso("/necessidades", "Necessidade cancelada");
}

/** O comprador define a quantidade a cotar de cada item (a do sistema é só sugestão). */
export async function alterarQuantidades(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const volta = texto(fd, "volta") || "/necessidades";
  const ids = fd.getAll("necessidadeId").map(Number);
  const itens = await prisma.necessidadeCompra.findMany({ where: { id: { in: ids } }, include: { produto: true, cotacao: true } });
  const mudancas: string[] = [];
  for (const n of itens) {
    const qtd = numero(fd, `qtd_${n.id}`);
    if (!Number.isInteger(qtd) || qtd <= 0) falhar(volta, `Quantidade inválida para ${n.produto.nome}`);
    if (qtd === n.quantidade) continue;
    const editavel = n.status === "ABERTA" || (n.status === "EM_COTACAO" && n.cotacao?.status === "ABERTA");
    if (!editavel) falhar(volta, `${n.produto.nome} já foi comprado`);
    await prisma.necessidadeCompra.update({ where: { id: n.id }, data: { quantidade: qtd } });
    mudancas.push(`${n.produto.sku}: ${n.quantidade} → ${qtd}`);
  }
  if (mudancas.length === 0) sucesso(volta, "Nenhuma quantidade alterada");
  await registrarLog(sessao.id, "QUANTIDADE_ALTERADA", "NecessidadeCompra", ids[0], mudancas.join("; "));
  revalidatePath("/", "layout");
  sucesso(volta, `Quantidade atualizada (${mudancas.length} item(ns))`);
}

/** Gera uma cotação única com todos os itens em aberto da categoria (a partir de um item ou da categoria). */
export async function gerarCotacao(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  let categoria = texto(fd, "categoria");
  const necessidadeId = Number(fd.get("necessidadeId") || 0);
  if (necessidadeId) {
    const n = await prisma.necessidadeCompra.findUnique({ where: { id: necessidadeId }, include: { produto: true, cotacao: true } });
    if (!n) falhar("/necessidades", "Necessidade não encontrada");
    if (n.cotacao && n.cotacao.status !== "CANCELADA") redirect(`/cotacoes/${n.cotacao.id}`);
    if (n.status !== "ABERTA") falhar("/necessidades", "Esta necessidade não está mais em aberto");
    categoria = n.produto.categoria;
  }
  if (!categoria) falhar("/necessidades", "Categoria não informada");
  let resultado;
  try {
    resultado = await abrirCotacao(categoria, sessao.id);
  } catch (e) {
    falhar("/necessidades", e instanceof Error ? e.message : "Não foi possível abrir a cotação");
  }
  revalidatePath("/", "layout");
  const { cotacao, enviados, itens } = resultado;
  sucesso(`/cotacoes/${cotacao.id}`, `Cotação de ${categoria} aberta com ${itens} item(ns) e enviada a ${enviados} fornecedor(es)`);
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
  const c = await prisma.cotacao.findUnique({ where: { id }, include: { itens: { include: { produto: true }, orderBy: { id: "asc" } } } });
  if (!c) falhar("/cotacoes", "Cotação não encontrada");
  if (c.status !== "ABERTA") falhar(`/cotacoes/${id}`, "Esta cotação já foi encerrada");
  return c;
}

export async function adicionarProposta(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const cotacaoId = Number(fd.get("cotacaoId"));
  const volta = `/cotacoes/${cotacaoId}`;
  const c = await cotacaoAberta(cotacaoId);
  const fornecedorId = Number(fd.get("fornecedorId"));
  const prazo = numero(fd, "prazoEntregaDias");
  if (!fornecedorId) falhar(volta, "Selecione o fornecedor");
  const lido = lerItensDoFormulario(fd, c.itens);
  if (lido.erro || !lido.itens) falhar(volta, lido.erro ?? "Itens inválidos");
  if (lido.nenhum) {
    await registrarSemItens(cotacaoId, fornecedorId);
    await registrarLog(sessao.id, "FORNECEDOR_SEM_ITENS", "Cotacao", cotacaoId, `Fornecedor #${fornecedorId} não possui nenhum item`);
    sucesso(volta, "Registrado: o fornecedor não possui nenhum dos itens");
  }
  if (!Number.isInteger(prazo) || prazo < 0) falhar(volta, "Prazo de entrega inválido");
  const forma = texto(fd, "formaPagamento");
  if (!formaValida(forma)) falhar(volta, "Selecione a forma de pagamento");
  const p = await salvarProposta({ cotacaoId, fornecedorId, prazoEntregaDias: prazo, formaPagamento: forma, observacao: texto(fd, "observacao") || null, origem: "MANUAL", itens: lido.itens });
  await prisma.solicitacaoCotacao.updateMany({ where: { cotacaoId, fornecedorId, respondidoEm: null }, data: { respondidoEm: new Date() } });
  await registrarLog(sessao.id, "PROPOSTA_REGISTRADA", "Proposta", p.id, `Cotação #${cotacaoId}, ${lido.itens.length} item(ns), ${prazo} dias`);
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

/** Demonstração: simula os fornecedores convidados respondendo ao pedido de cotação. */
export async function simularPropostasCotacao(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const cotacaoId = Number(fd.get("cotacaoId"));
  const c = await cotacaoAberta(cotacaoId);
  const pendentes = await prisma.solicitacaoCotacao.findMany({ where: { cotacaoId, respondidoEm: null }, include: { fornecedor: true } });
  // Sem pedido enviado, simula todos os fornecedores ativos que ainda não responderam
  const jaResponderam = [
    ...(await prisma.proposta.findMany({ where: { cotacaoId }, select: { fornecedorId: true } })),
    ...(await prisma.solicitacaoCotacao.findMany({ where: { cotacaoId, semItens: true }, select: { fornecedorId: true } })),
  ];
  const fornecedores = (await prisma.solicitacaoCotacao.count({ where: { cotacaoId, semItens: false } })) > 0
    ? pendentes.map((s) => s.fornecedor)
    : await prisma.fornecedor.findMany({ where: { ativo: true, id: { notIn: jaResponderam.map((p) => p.fornecedorId) } } });
  if (fornecedores.length === 0) falhar(`/cotacoes/${cotacaoId}`, "Todos os fornecedores convidados já responderam");
  const propostas = simularPropostas(
    fornecedores,
    c.itens.map((i) => ({ necessidadeId: i.id, quantidade: i.quantidade, precoReferencia: i.produto.precoReferencia ?? 50 })),
  );
  for (const p of propostas) await salvarProposta({ cotacaoId, ...p });
  await prisma.solicitacaoCotacao.updateMany({
    where: { cotacaoId, fornecedorId: { in: propostas.map((p) => p.fornecedorId) } },
    data: { respondidoEm: new Date(), visualizadoEm: new Date() },
  });
  await registrarLog(sessao.id, "PROPOSTAS_SIMULADAS", "Cotacao", cotacaoId, `${propostas.length} fornecedores`);
  sucesso(`/cotacoes/${cotacaoId}`, `${propostas.length} proposta(s) simulada(s) recebida(s) dos fornecedores`);
}

// ---------- Decisão do comprador (o sistema recomenda; a escolha final é sempre humana) ----------
export async function aprovarProposta(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const cotacaoId = Number(fd.get("cotacaoId"));
  const propostaId = Number(fd.get("propostaId"));
  const justificativa = texto(fd, "justificativa");
  const volta = `/cotacoes/${cotacaoId}`;
  const c = await cotacaoAberta(cotacaoId);
  const propostas = await prisma.proposta.findMany({ where: { cotacaoId }, include: { fornecedor: true, itens: true } });
  const pesos = await obterPesos();
  const { necessarios, entradas } = paraAlgoritmo(c.itens, propostas);
  const ranking = classificarPropostas(entradas, necessarios, pesos);
  const escolhida = ranking.find((r) => r.id === propostaId);
  if (!escolhida) falhar(volta, "Proposta não encontrada");
  const seguiu = escolhida.posicao === 1;
  if (!seguiu && justificativa.length < 5) {
    falhar(volta, "Informe uma justificativa ao escolher uma proposta diferente da recomendada");
  }
  // Quantidade que o comprador decidiu comprar de cada item, dentro do que o fornecedor oferece
  const comprar = new Map<number, number>();
  for (const ic of escolhida.itensCalculados) {
    const n = c.itens.find((i) => i.id === ic.necessidadeId)!;
    const qtd = fd.get(`comprar_${ic.necessidadeId}`) == null ? ic.quantidadeCompra : numero(fd, `comprar_${ic.necessidadeId}`);
    if (!Number.isInteger(qtd) || qtd <= 0) falhar(volta, `Informe a quantidade a comprar de ${n.produto.nome}`);
    if (qtd > ic.quantidadeDisponivel) falhar(volta, `${n.produto.nome}: ${escolhida.fornecedor} só tem ${ic.quantidadeDisponivel} ${n.produto.unidade}`);
    if (qtd < ic.quantidadeMinima) falhar(volta, `${n.produto.nome}: ${escolhida.fornecedor} exige compra mínima de ${ic.quantidadeMinima} ${n.produto.unidade}`);
    comprar.set(ic.necessidadeId, qtd);
  }
  // Itens que o fornecedor escolhido não cotou voltam para "em aberto" e podem entrar em outra cotação
  const atendidos = escolhida.itensCalculados.map((i) => i.necessidadeId);
  const naoAtendidos = c.itens.map((i) => i.id).filter((id) => !atendidos.includes(id));
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
        formaPagamento: propostas.find((p) => p.id === propostaId)?.formaPagamento,
      },
    }),
    prisma.cotacao.update({ where: { id: cotacaoId }, data: { status: "APROVADA", encerradaEm: new Date() } }),
    ...[...comprar].map(([id, qtd]) => prisma.necessidadeCompra.update({ where: { id }, data: { status: "ATENDIDA", quantidadeComprada: qtd } })),
    prisma.necessidadeCompra.updateMany({ where: { id: { in: naoAtendidos } }, data: { status: "ABERTA", cotacaoId: null } }),
  ]);
  await registrarLog(sessao.id, "COMPRA_APROVADA", "Cotacao", cotacaoId,
    `${escolhida.fornecedor} (${escolhida.pontuacao} pts, ${seguiu ? "recomendada" : "diferente da recomendada"})`);
  // O pedido de compra vai por e-mail ao fornecedor escolhido; os demais recebem o aviso de encerramento
  const pedidoPara = await enviarPedidoCompra(cotacaoId);
  // O comprador recebe o resumo da compra com valor e forma de pagamento para efetuar o pagamento
  const resumoPara = await enviarResumoAoComprador(cotacaoId, sessao.id);
  revalidatePath("/", "layout");
  const pedido = (pedidoPara ? ` Pedido de compra enviado por e-mail para ${pedidoPara}.` : " O fornecedor não tem e-mail cadastrado: envie o pedido de compra impresso.")
    + (resumoPara ? ` Dados para pagamento enviados para ${resumoPara}.` : "");
  const aviso = naoAtendidos.length > 0 ? ` ${naoAtendidos.length} item(ns) não cotado(s) por este fornecedor voltaram para Necessidades.` : "";
  sucesso(volta, `Proposta selecionada e registrada no histórico.${pedido}${aviso}`);
}

export async function reenviarPedido(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const cotacaoId = Number(fd.get("cotacaoId"));
  const para = await enviarPedidoCompra(cotacaoId, false);
  if (!para) falhar(`/cotacoes/${cotacaoId}`, "O fornecedor escolhido não tem e-mail cadastrado");
  await registrarLog(sessao.id, "PEDIDO_REENVIADO", "Cotacao", cotacaoId, para);
  sucesso(`/cotacoes/${cotacaoId}`, `Pedido de compra reenviado para ${para}`);
}

/** O comprador confirma que pagou o fornecedor; o fornecedor é avisado para seguir com a entrega. */
export async function registrarPagamento(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const cotacaoId = Number(fd.get("cotacaoId"));
  const volta = `/cotacoes/${cotacaoId}`;
  const decisao = await prisma.decisao.findUnique({ where: { cotacaoId } });
  if (!decisao) falhar(volta, "Esta cotação ainda não foi aprovada");
  if (decisao.pagoEm) falhar(volta, "Pagamento já registrado");
  const referencia = texto(fd, "referencia") || null;
  await prisma.decisao.update({ where: { id: decisao.id }, data: { pagoEm: new Date(), pagamentoReferencia: referencia } });
  const para = await avisarPagamentoAoFornecedor(cotacaoId);
  await registrarLog(sessao.id, "PAGAMENTO_REGISTRADO", "Cotacao", cotacaoId, referencia ?? undefined);
  revalidatePath("/", "layout");
  sucesso(volta, `Pagamento registrado.${para ? ` O fornecedor foi avisado em ${para} para seguir com a entrega.` : ""}`);
}

export async function cancelarCotacao(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const id = Number(fd.get("cotacaoId"));
  await cotacaoAberta(id);
  await prisma.$transaction([
    prisma.cotacao.update({ where: { id }, data: { status: "CANCELADA", encerradaEm: new Date() } }),
    prisma.necessidadeCompra.updateMany({ where: { cotacaoId: id, status: "EM_COTACAO" }, data: { status: "ABERTA" } }),
  ]);
  await registrarLog(sessao.id, "COTACAO_CANCELADA", "Cotacao", id);
  sucesso("/necessidades", "Cotação cancelada; os itens voltaram para Necessidades");
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
    include: { proposta: { include: { itens: { include: { necessidade: { include: { produto: true } } } } } } },
  });
  if (!decisao) falhar(volta, "Esta cotação ainda não foi aprovada");
  if (decisao.recebidoEm) falhar(volta, "Recebimento já registrado");
  if (!decisao.pagoEm) falhar(volta, "Registre o pagamento ao fornecedor antes do recebimento");

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

  // Dá entrada na API de estoque de cada item comprado
  let msgEstoque = "";
  try {
    for (const item of decisao.proposta.itens) {
      if (item.necessidade.status !== "ATENDIDA") continue;
      const qtd = item.necessidade.quantidadeComprada ?? quantidadeCompra(item.necessidade.quantidade, item);
      await registrarEntrada(item.necessidade.produto.sku, qtd, `Recebimento da cotação #${cotacaoId}`);
    }
    await sincronizarEstoque("AUTOMATICA", sessao.id);
    msgEstoque = " Entrada dos itens enviada à API de estoque.";
  } catch {
    msgEstoque = " Não foi possível dar entrada na API de estoque.";
  }
  await registrarLog(sessao.id, "RECEBIMENTO", "Cotacao", cotacaoId, `Avaliação ${avaliacao}, ${noPrazo ? "no prazo" : "com atraso"}; nota do fornecedor ${novaNota}`);
  revalidatePath("/", "layout");
  sucesso(volta, `Recebimento registrado. Nova nota do fornecedor: ${novaNota}.${msgEstoque}`);
}
