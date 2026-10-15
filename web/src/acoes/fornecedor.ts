"use server";

import { prisma } from "@/lib/db";
import { registrarLog } from "@/lib/log";
import { falhar, numero, sucesso, texto } from "./util";

/** Resposta do fornecedor pelo link exclusivo do pedido de cotação (não exige login). */
export async function responderCotacao(fd: FormData) {
  const token = texto(fd, "token");
  const volta = `/responder/${encodeURIComponent(token)}`;
  const s = await prisma.solicitacaoCotacao.findUnique({ where: { token }, include: { cotacao: true, fornecedor: true } });
  if (!s) falhar(volta, "Link de cotação inválido");
  if (s.cotacao.status !== "ABERTA") falhar(volta, "Esta cotação já foi encerrada pelo hospital");
  if (s.cotacao.prazoResposta && s.cotacao.prazoResposta < new Date()) falhar(volta, "O prazo para responder esta cotação terminou");
  const preco = numero(fd, "precoUnitario");
  const prazo = numero(fd, "prazoEntregaDias");
  const disponivel = numero(fd, "quantidadeDisponivel");
  const minima = numero(fd, "quantidadeMinima");
  if (!(preco > 0)) falhar(volta, "Informe o preço unitário");
  if (!Number.isInteger(prazo) || prazo < 0) falhar(volta, "Informe o prazo de entrega em dias");
  if (!Number.isInteger(disponivel) || disponivel < 0) falhar(volta, "Informe a quantidade disponível");
  const dados = {
    precoUnitario: preco,
    prazoEntregaDias: prazo,
    quantidadeDisponivel: disponivel,
    quantidadeMinima: Number.isInteger(minima) && minima > 0 ? minima : 1,
    observacao: texto(fd, "observacao") || null,
    origem: "FORNECEDOR" as const,
  };
  const p = await prisma.proposta.upsert({
    where: { cotacaoId_fornecedorId: { cotacaoId: s.cotacaoId, fornecedorId: s.fornecedorId } },
    create: { cotacaoId: s.cotacaoId, fornecedorId: s.fornecedorId, ...dados },
    update: dados,
  });
  const primeira = !s.respondidoEm;
  await prisma.solicitacaoCotacao.update({ where: { id: s.id }, data: { respondidoEm: new Date() } });
  await registrarLog(null, primeira ? "PROPOSTA_FORNECEDOR" : "PROPOSTA_FORNECEDOR_ALTERADA", "Proposta", p.id,
    `${s.fornecedor.nome} respondeu a cotação #${s.cotacaoId}: R$ ${preco}, ${prazo} dias`);
  sucesso(volta, primeira ? "Proposta enviada com sucesso. Obrigado!" : "Proposta atualizada com sucesso.");
}
