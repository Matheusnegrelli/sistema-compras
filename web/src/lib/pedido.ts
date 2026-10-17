import { prisma } from "./db";
import { enviarEmail } from "./email";
import { data, moeda } from "./formato";
import { NOME_SISTEMA } from "./marca";
import type { PropostaClassificada } from "./pontuacao";
import { NOME_HOSPITAL } from "./solicitacoes";

/** Itens do pedido de compra: o que foi comprado do fornecedor escolhido, com quantidade e valor. */
export async function carregarPedido(cotacaoId: number) {
  const cotacao = await prisma.cotacao.findUnique({
    where: { id: cotacaoId },
    include: {
      itens: { include: { produto: { include: { setor: true } } } },
      decisao: { include: { gestor: true, proposta: { include: { fornecedor: true } } } },
    },
  });
  if (!cotacao?.decisao) return null;
  const { decisao } = cotacao;
  const escolhida = (decisao.ranking as unknown as PropostaClassificada[]).find((r) => r.id === decisao.propostaId);
  const itens = (escolhida?.itensCalculados ?? []).flatMap((ic) => {
    const n = cotacao.itens.find((i) => i.id === ic.necessidadeId);
    return n ? [{ ...ic, produto: n.produto }] : [];
  });
  const total = itens.reduce((a, i) => a + i.valor, 0);
  const prazo = decisao.proposta.prazoEntregaDias;
  const entregaPrevista = new Date(decisao.decididoEm.getTime() + prazo * 86_400_000);
  return { cotacao, decisao, fornecedor: decisao.proposta.fornecedor, itens, total, prazo, entregaPrevista };
}

/**
 * Envia o pedido de compra ao fornecedor escolhido e avisa os demais que responderam.
 * Retorna o e-mail para onde o pedido foi enviado (ou null se o fornecedor não tem e-mail).
 */
export async function enviarPedidoCompra(cotacaoId: number, avisarDemais = true) {
  const pedido = await carregarPedido(cotacaoId);
  if (!pedido) return null;
  const { cotacao, decisao, fornecedor, itens, total, prazo, entregaPrevista } = pedido;
  const solicitacoes = await prisma.solicitacaoCotacao.findMany({ where: { cotacaoId } });
  const solicitacaoDe = (fornecedorId: number) => solicitacoes.find((s) => s.fornecedorId === fornecedorId)?.id;
  const assinatura = ["", `Setor de Compras · ${NOME_HOSPITAL}`, `Comprador responsável: ${decisao.gestor.nome}`, `Enviado automaticamente pelo ${NOME_SISTEMA}`];

  let enviadoPara: string | null = null;
  if (fornecedor.email) {
    const corpo = [
      `Olá, ${fornecedor.contato || fornecedor.nome}.`,
      "",
      `Sua proposta para a cotação #${cotacaoId} (${cotacao.categoria}) foi selecionada. Segue o pedido de compra nº ${cotacaoId}:`,
      "",
      ...itens.map((i) => `  - ${i.produto.nome} (${i.produto.sku}): ${i.quantidadeCompra} ${i.produto.unidade} x ${moeda(i.precoUnitario)} = ${moeda(i.valor)}`),
      "",
      `Valor total: ${moeda(total)}`,
      `Prazo de entrega: ${prazo} dia(s), previsão ${data(entregaPrevista)}`,
      `Local de entrega: Almoxarifado · ${NOME_HOSPITAL}`,
      "",
      "Por favor, confirme o recebimento deste pedido respondendo a este e-mail e informe a nota fiscal na entrega.",
      ...assinatura,
    ].join("\n");
    await enviarEmail({ para: fornecedor.email, assunto: `Pedido de compra nº ${cotacaoId} · ${NOME_HOSPITAL}`, corpo, solicitacaoId: solicitacaoDe(fornecedor.id) });
    enviadoPara = fornecedor.email;
  }

  // Fornecedores que enviaram proposta e não foram escolhidos recebem um aviso de encerramento
  const outras = avisarDemais
    ? await prisma.proposta.findMany({ where: { cotacaoId, id: { not: decisao.propostaId } }, include: { fornecedor: true } })
    : [];
  for (const p of outras) {
    if (!p.fornecedor.email) continue;
    await enviarEmail({
      para: p.fornecedor.email,
      assunto: `Cotação #${cotacaoId} encerrada · ${NOME_HOSPITAL}`,
      corpo: [
        `Olá, ${p.fornecedor.contato || p.fornecedor.nome}.`,
        "",
        `A cotação #${cotacaoId} (${cotacao.categoria}) foi encerrada e, desta vez, outra proposta foi selecionada.`,
        "Agradecemos a sua participação e contamos com você nas próximas cotações.",
        ...assinatura,
      ].join("\n"),
      solicitacaoId: solicitacaoDe(p.fornecedorId),
    });
  }
  await prisma.decisao.update({ where: { id: decisao.id }, data: { pedidoEnviadoEm: enviadoPara ? new Date() : null } });
  return enviadoPara;
}
