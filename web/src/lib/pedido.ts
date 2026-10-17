import { prisma } from "./db";
import { enviarEmail } from "./email";
import { data, formatarCnpj, moeda } from "./formato";
import { NOME_SISTEMA } from "./marca";
import type { PropostaClassificada } from "./pontuacao";
import { formaPagamento, vencimento } from "./pagamento";
import { NOME_HOSPITAL } from "./solicitacoes";

const urlCotacao = (id: number) => `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/cotacoes/${id}`;

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
    if (!n) return [];
    // Vale a quantidade que o comprador decidiu na aprovação
    const quantidadeCompra = n.quantidadeComprada ?? ic.quantidadeCompra;
    return [{ ...ic, quantidadeCompra, valor: Math.round(quantidadeCompra * ic.precoUnitario * 100) / 100, produto: n.produto }];
  });
  const total = itens.reduce((a, i) => a + i.valor, 0);
  const prazo = decisao.proposta.prazoEntregaDias;
  const entregaPrevista = new Date(decisao.decididoEm.getTime() + prazo * 86_400_000);
  const forma = formaPagamento(decisao.formaPagamento ?? decisao.proposta.formaPagamento);
  const venceEm = vencimento(decisao.decididoEm, forma.valor);
  return { cotacao, decisao, fornecedor: decisao.proposta.fornecedor, itens, total, prazo, entregaPrevista, forma, venceEm };
}

/**
 * Envia o pedido de compra ao fornecedor escolhido e avisa os demais que responderam.
 * Retorna o e-mail para onde o pedido foi enviado (ou null se o fornecedor não tem e-mail).
 */
export async function enviarPedidoCompra(cotacaoId: number, avisarDemais = true) {
  const pedido = await carregarPedido(cotacaoId);
  if (!pedido) return null;
  const { cotacao, decisao, fornecedor, itens, total, prazo, entregaPrevista, forma } = pedido;
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
      `Forma de pagamento: ${forma.rotulo}`,
      "",
      "O pedido de compra segue em PDF, em anexo. Por favor, confirme o recebimento respondendo a este e-mail. Enviaremos a confirmação do pagamento para você seguir com a entrega; informe a nota fiscal na entrega.",
      ...assinatura,
    ].join("\n");
    const { gerarPedidoPdf } = await import("./pedido-pdf");
    const pdf = await gerarPedidoPdf(cotacaoId);
    await enviarEmail({
      para: fornecedor.email,
      assunto: `Pedido de compra nº ${cotacaoId} · ${NOME_HOSPITAL}`,
      corpo,
      solicitacaoId: solicitacaoDe(fornecedor.id),
      responderPara: decisao.gestor.email,
      anexos: pdf ? [{ nome: `pedido-de-compra-${cotacaoId}.pdf`, conteudo: pdf }] : [],
    });
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
      responderPara: decisao.gestor.email,
    });
  }
  await prisma.decisao.update({ where: { id: decisao.id }, data: { pedidoEnviadoEm: enviadoPara ? new Date() : null } });
  return enviadoPara;
}

/** E-mail ao comprador com o resumo da compra, o valor e os dados para efetuar o pagamento. */
export async function enviarResumoAoComprador(cotacaoId: number, usuarioId: number) {
  const pedido = await carregarPedido(cotacaoId);
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!pedido || !usuario?.email) return null;
  const { cotacao, fornecedor, itens, total, prazo, forma, venceEm } = pedido;
  const corpo = [
    `Olá, ${usuario.nome}.`,
    "",
    `A compra da cotação #${cotacaoId} (${cotacao.categoria}) foi aprovada. Efetue o pagamento para o fornecedor seguir com a entrega.`,
    "",
    "FORNECEDOR",
    `  ${fornecedor.nome} · CNPJ ${formatarCnpj(fornecedor.cnpj)}`,
    `  ${[fornecedor.contato, fornecedor.email, fornecedor.telefone].filter(Boolean).join(" · ")}`,
    "",
    `ITENS DO PEDIDO Nº ${cotacaoId}`,
    ...itens.map((i) => `  - ${i.produto.nome}: ${i.quantidadeCompra} ${i.produto.unidade} x ${moeda(i.precoUnitario)} = ${moeda(i.valor)}`),
    "",
    "PAGAMENTO",
    `  Valor total: ${moeda(total)}`,
    `  Forma de pagamento: ${forma.rotulo}`,
    forma.valor === "BOLETO_30_60"
      ? `  Parcelas: 2 x ${moeda(Math.round((total / 2) * 100) / 100)}, vencimentos ${data(venceEm)} e ${data(new Date(venceEm.getTime() + 30 * 86_400_000))}`
      : `  Vencimento: ${data(venceEm)}`,
    `  Dados para pagamento: ${fornecedor.dadosPagamento ?? (forma.valor.startsWith("BOLETO") ? "o fornecedor enviará o boleto junto com a nota fiscal" : "solicite ao fornecedor")}`,
    "",
    `Entrega: ${prazo} dia(s) após a confirmação do pagamento.`,
    "",
    "Depois de pagar, registre o pagamento no sistema para o fornecedor ser avisado:",
    urlCotacao(cotacaoId),
    "",
    `Enviado automaticamente pelo ${NOME_SISTEMA}`,
  ].join("\n");
  await enviarEmail({ para: usuario.email, assunto: `Compra aprovada nº ${cotacaoId} · pagamento de ${moeda(total)} a ${fornecedor.nome}`, corpo });
  return usuario.email;
}

/** Avisa o fornecedor que o pagamento foi feito e que ele pode seguir com a entrega. */
export async function avisarPagamentoAoFornecedor(cotacaoId: number) {
  const pedido = await carregarPedido(cotacaoId);
  if (!pedido?.fornecedor.email || !pedido.decisao.pagoEm) return null;
  const { decisao, fornecedor, total, prazo, forma } = pedido;
  const previsao = new Date(decisao.pagoEm!.getTime() + prazo * 86_400_000);
  const solicitacao = await prisma.solicitacaoCotacao.findFirst({ where: { cotacaoId, fornecedorId: fornecedor.id } });
  await enviarEmail({
    para: fornecedor.email!,
    assunto: `Pagamento confirmado · Pedido de compra nº ${cotacaoId} · ${NOME_HOSPITAL}`,
    corpo: [
      `Olá, ${fornecedor.contato || fornecedor.nome}.`,
      "",
      `Confirmamos o pagamento do pedido de compra nº ${cotacaoId}, no valor de ${moeda(total)} (${forma.rotulo}).`,
      decisao.pagamentoReferencia ? `Referência do pagamento: ${decisao.pagamentoReferencia}` : "",
      "",
      `Pode seguir com a entrega. Previsão: ${data(previsao)} (${prazo} dia(s)), no Almoxarifado do ${NOME_HOSPITAL}.`,
      "",
      `Setor de Compras · ${NOME_HOSPITAL}`,
      `Enviado automaticamente pelo ${NOME_SISTEMA}`,
    ].join("\n"),
    solicitacaoId: solicitacao?.id,
    responderPara: decisao.gestor.email,
  });
  return fornecedor.email;
}
