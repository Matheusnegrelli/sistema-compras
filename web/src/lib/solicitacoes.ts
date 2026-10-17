import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { enviarEmail } from "./email";
import { registrarLog } from "./log";
import { dataHora } from "./formato";
import { NOME_HOSPITAL, NOME_SISTEMA } from "./marca";

export { NOME_HOSPITAL };

export function urlResposta(token: string) {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/responder/${token}`;
}

export async function obterConfiguracaoEnvio() {
  const c = await prisma.configuracaoPesos.findUnique({ where: { id: 1 } });
  return { envioAutomatico: c?.envioAutomatico ?? false, prazoRespostaHoras: c?.prazoRespostaHoras ?? 48 };
}

/** Necessidades em aberto de uma categoria que ainda não estão em uma cotação ativa. */
export function necessidadesLivres(categoria: string) {
  return prisma.necessidadeCompra.findMany({
    where: {
      status: "ABERTA",
      produto: { categoria },
      OR: [{ cotacaoId: null }, { cotacao: { status: "CANCELADA" } }],
    },
    orderBy: { id: "asc" },
  });
}

/**
 * Abre uma cotação única com todos os itens em aberto da categoria e envia o pedido
 * a todos os fornecedores ativos. usuarioId nulo = aberta pela rotina automática.
 */
export async function abrirCotacao(categoria: string, usuarioId: number | null) {
  const itens = await necessidadesLivres(categoria);
  if (itens.length === 0) throw new Error(`Não há itens em aberto na categoria ${categoria}`);
  const { prazoRespostaHoras } = await obterConfiguracaoEnvio();
  const prazoResposta = new Date(Date.now() + prazoRespostaHoras * 3_600_000);
  const cotacao = await prisma.$transaction(async (tx) => {
    const c = await tx.cotacao.create({ data: { categoria, criadoPorId: usuarioId, prazoResposta } });
    await tx.necessidadeCompra.updateMany({ where: { id: { in: itens.map((i) => i.id) } }, data: { status: "EM_COTACAO", cotacaoId: c.id } });
    return c;
  });
  await registrarLog(usuarioId, "COTACAO_CRIADA", "Cotacao", cotacao.id,
    `${categoria}: ${itens.length} item(ns)${usuarioId ? "" : " (aberta automaticamente pela rotina de estoque)"}`);
  const enviados = await enviarSolicitacoes(cotacao.id, usuarioId);
  return { cotacao, enviados, itens: itens.length };
}

/** Envia o pedido de cotação aos fornecedores ativos com e-mail que ainda não foram convidados. */
export async function enviarSolicitacoes(cotacaoId: number, usuarioId: number | null) {
  const cotacao = await prisma.cotacao.findUniqueOrThrow({
    where: { id: cotacaoId },
    include: { itens: { include: { produto: { include: { setor: true } } }, orderBy: { id: "asc" } }, solicitacoes: { select: { fornecedorId: true } } },
  });
  const convidados = cotacao.solicitacoes.map((s) => s.fornecedorId);
  const fornecedores = await prisma.fornecedor.findMany({
    where: { ativo: true, email: { not: null }, id: { notIn: convidados } },
  });
  // Respostas ao e-mail vão para quem abriu a cotação (ou para o setor, se foi a rotina automática)
  const responsavelId = usuarioId ?? cotacao.criadoPorId;
  const responsavel = responsavelId ? await prisma.usuario.findUnique({ where: { id: responsavelId } }) : null;
  const listaItens = cotacao.itens.map((i) => `  - ${i.produto.nome} (${i.produto.sku}): ${i.quantidade} ${i.produto.unidade} · ${i.produto.setor?.nome ?? "-"}`);
  for (const f of fornecedores) {
    const s = await prisma.solicitacaoCotacao.create({
      data: { cotacaoId, fornecedorId: f.id, token: randomBytes(24).toString("base64url") },
    });
    const corpo = [
      `Olá, ${f.contato || f.nome}.`,
      "",
      `${NOME_HOSPITAL} solicita cotação dos itens abaixo (categoria ${cotacao.categoria}):`,
      "",
      ...listaItens,
      "",
      cotacao.prazoResposta ? `Responder até: ${dataHora(cotacao.prazoResposta)}` : "",
      "",
      "Para enviar sua proposta (preço de cada item, quantidade disponível e prazo de entrega), acesse:",
      urlResposta(s.token),
      "",
      "Você pode cotar só os itens com que trabalha. Este link é exclusivo da sua empresa e não exige cadastro.",
      "",
      `Setor de Compras · ${NOME_HOSPITAL}`,
      `Enviado automaticamente pelo ${NOME_SISTEMA}`,
    ].join("\n");
    await enviarEmail({
      para: f.email!,
      assunto: `Pedido de cotação #${cotacaoId} · ${cotacao.categoria} (${cotacao.itens.length} ${cotacao.itens.length === 1 ? "item" : "itens"})`,
      corpo,
      solicitacaoId: s.id,
      responderPara: responsavel?.email,
    });
  }
  if (fornecedores.length > 0) {
    await registrarLog(usuarioId, "COTACAO_ENVIADA", "Cotacao", cotacaoId, `Pedido enviado a ${fornecedores.length} fornecedor(es)`);
  }
  return fornecedores.length;
}
