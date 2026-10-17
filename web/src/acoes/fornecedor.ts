"use server";

import { prisma } from "@/lib/db";
import { registrarLog } from "@/lib/log";
import { lerItensDoFormulario, registrarSemItens, salvarProposta } from "@/lib/propostas";
import { formaValida } from "@/lib/pagamento";
import { falhar, numero, sucesso, texto } from "./util";

/** Resposta do fornecedor pelo link exclusivo do pedido de cotação (não exige login). */
export async function responderCotacao(fd: FormData) {
  const token = texto(fd, "token");
  const volta = `/responder/${encodeURIComponent(token)}`;
  const s = await prisma.solicitacaoCotacao.findUnique({
    where: { token },
    include: { cotacao: { include: { itens: { include: { produto: true }, orderBy: { id: "asc" } } } }, fornecedor: true },
  });
  if (!s) falhar(volta, "Link de cotação inválido");
  if (s.cotacao.status !== "ABERTA") falhar(volta, "Esta cotação já foi encerrada pelo hospital");
  if (s.cotacao.prazoResposta && s.cotacao.prazoResposta < new Date()) falhar(volta, "O prazo para responder esta cotação terminou");
  const lido = lerItensDoFormulario(fd, s.cotacao.itens.filter((i) => i.status === "EM_COTACAO"));
  if (lido.erro || !lido.itens) falhar(volta, lido.erro ?? "Itens inválidos");
  if (lido.nenhum) {
    await registrarSemItens(s.cotacaoId, s.fornecedorId);
    await registrarLog(null, "FORNECEDOR_SEM_ITENS", "Cotacao", s.cotacaoId, `${s.fornecedor.nome} não possui nenhum item da cotação #${s.cotacaoId}`);
    sucesso(volta, "Resposta registrada: você não possui nenhum dos itens. Obrigado por responder!");
  }
  const prazo = numero(fd, "prazoEntregaDias");
  if (!Number.isInteger(prazo) || prazo < 0) falhar(volta, "Informe o prazo de entrega em dias");
  const forma = texto(fd, "formaPagamento");
  if (!formaValida(forma)) falhar(volta, "Selecione a forma de pagamento");
  const p = await salvarProposta({
    cotacaoId: s.cotacaoId, fornecedorId: s.fornecedorId, prazoEntregaDias: prazo, formaPagamento: forma,
    observacao: texto(fd, "observacao") || null, origem: "FORNECEDOR", itens: lido.itens,
  });
  const primeira = !s.respondidoEm;
  await prisma.solicitacaoCotacao.update({ where: { id: s.id }, data: { respondidoEm: new Date() } });
  await registrarLog(null, primeira ? "PROPOSTA_FORNECEDOR" : "PROPOSTA_FORNECEDOR_ALTERADA", "Proposta", p.id,
    `${s.fornecedor.nome} respondeu a cotação #${s.cotacaoId}: ${lido.itens.length} item(ns), ${prazo} dias`);
  sucesso(volta, primeira ? "Proposta enviada com sucesso. Obrigado!" : "Proposta atualizada com sucesso.");
}
