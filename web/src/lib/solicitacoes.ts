import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { enviarEmail } from "./email";
import { registrarLog } from "./log";
import { dataHora } from "./formato";
import { NOME_SISTEMA } from "./marca";

export const NOME_HOSPITAL = process.env.NOME_HOSPITAL || "Hospital Regional";

export function urlResposta(token: string) {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/responder/${token}`;
}

export async function obterConfiguracaoEnvio() {
  const c = await prisma.configuracaoPesos.findUnique({ where: { id: 1 } });
  return { envioAutomatico: c?.envioAutomatico ?? false, prazoRespostaHoras: c?.prazoRespostaHoras ?? 48 };
}

/**
 * Abre a cotação de uma necessidade (ou reabre uma cancelada) e envia o pedido de
 * cotação a todos os fornecedores ativos. usuarioId nulo = aberta pela rotina automática.
 */
export async function abrirCotacao(necessidadeId: number, usuarioId: number | null) {
  const necessidade = await prisma.necessidadeCompra.findUniqueOrThrow({ where: { id: necessidadeId }, include: { cotacao: true } });
  const existente = necessidade.cotacao;
  if (existente && existente.status !== "CANCELADA") return { cotacao: existente, enviados: 0 };
  if (necessidade.status !== "ABERTA") throw new Error("Esta necessidade não está mais em aberto");
  const { prazoRespostaHoras } = await obterConfiguracaoEnvio();
  const prazoResposta = new Date(Date.now() + prazoRespostaHoras * 3_600_000);
  const cotacao = await prisma.$transaction(async (tx) => {
    // Uma cotação cancelada é reaberta do zero (a necessidade só pode ter uma cotação)
    const c = existente
      ? await tx.cotacao.update({
          where: { id: existente.id },
          data: {
            status: "ABERTA", encerradaEm: null, criadoPorId: usuarioId, criadoEm: new Date(), prazoResposta,
            propostas: { deleteMany: {} }, solicitacoes: { deleteMany: {} },
          },
        })
      : await tx.cotacao.create({ data: { necessidadeId, criadoPorId: usuarioId, prazoResposta } });
    await tx.necessidadeCompra.update({ where: { id: necessidadeId }, data: { status: "EM_COTACAO" } });
    return c;
  });
  await registrarLog(usuarioId, "COTACAO_CRIADA", "Cotacao", cotacao.id,
    `Necessidade #${necessidadeId}${usuarioId ? "" : " (aberta automaticamente pela rotina de estoque)"}`);
  const enviados = await enviarSolicitacoes(cotacao.id, usuarioId);
  return { cotacao, enviados };
}

/** Envia o pedido de cotação aos fornecedores ativos com e-mail que ainda não foram convidados. */
export async function enviarSolicitacoes(cotacaoId: number, usuarioId: number | null) {
  const cotacao = await prisma.cotacao.findUniqueOrThrow({
    where: { id: cotacaoId },
    include: { necessidade: { include: { produto: { include: { setor: true } } } }, solicitacoes: { select: { fornecedorId: true } } },
  });
  const convidados = cotacao.solicitacoes.map((s) => s.fornecedorId);
  const fornecedores = await prisma.fornecedor.findMany({
    where: { ativo: true, email: { not: null }, id: { notIn: convidados } },
  });
  const { produto, quantidade } = cotacao.necessidade;
  for (const f of fornecedores) {
    const s = await prisma.solicitacaoCotacao.create({
      data: { cotacaoId, fornecedorId: f.id, token: randomBytes(24).toString("base64url") },
    });
    const corpo = [
      `Olá, ${f.contato || f.nome}.`,
      "",
      `${NOME_HOSPITAL} solicita cotação para o item abaixo:`,
      "",
      `Produto: ${produto.nome} (${produto.sku})`,
      `Quantidade: ${quantidade} ${produto.unidade}`,
      `Setor solicitante: ${produto.setor?.nome ?? "-"}`,
      cotacao.prazoResposta ? `Responder até: ${dataHora(cotacao.prazoResposta)}` : "",
      "",
      "Para enviar sua proposta (preço, prazo de entrega e quantidade disponível), acesse:",
      urlResposta(s.token),
      "",
      "Este link é exclusivo da sua empresa. Não é necessário criar conta.",
      "",
      `Setor de Compras · ${NOME_HOSPITAL}`,
      `Enviado automaticamente pelo ${NOME_SISTEMA}`,
    ].join("\n");
    await enviarEmail({ para: f.email!, assunto: `Pedido de cotação #${cotacaoId} · ${produto.nome}`, corpo, solicitacaoId: s.id });
  }
  if (fornecedores.length > 0) {
    await registrarLog(usuarioId, "COTACAO_ENVIADA", "Cotacao", cotacaoId, `Pedido enviado a ${fornecedores.length} fornecedor(es)`);
  }
  return fornecedores.length;
}
