import { randomBytes } from "node:crypto";
import type { Origem } from "@prisma/client";
import { prisma } from "./db";

export type ItemDigitado = { necessidadeId: number; precoUnitario: number; quantidadeDisponivel: number; quantidadeMinima: number };

function valor(fd: FormData, campo: string) {
  const bruto = String(fd.get(campo) ?? "").trim().replace(",", ".");
  return bruto === "" ? NaN : Number(bruto);
}

/**
 * Lê do formulário o preço de cada item (campos preco_<id>, disp_<id>, min_<id>).
 * O fornecedor marca "Não tenho" (sem_<id>) nos itens que não possui; os demais exigem preço.
 * Retorna `nenhum: true` quando o fornecedor não possui nenhum dos itens (botão próprio ou todos marcados).
 * Retorna erro em texto quando algo está inválido.
 */
export function lerItensDoFormulario(fd: FormData, itens: { id: number; quantidade: number; produto: { nome: string } }[]) {
  if (fd.get("nenhum") || itens.every((i) => fd.get(`sem_${i.id}`))) return { itens: [] as ItemDigitado[], nenhum: true };
  const lidos: ItemDigitado[] = [];
  for (const item of itens) {
    if (fd.get(`sem_${item.id}`)) continue;
    const preco = valor(fd, `preco_${item.id}`);
    if (Number.isNaN(preco)) return { erro: `Informe o preço de ${item.produto.nome} ou marque "Não tenho"` };
    if (!(preco > 0)) return { erro: `Preço inválido para ${item.produto.nome}` };
    const disponivel = valor(fd, `disp_${item.id}`);
    const minima = valor(fd, `min_${item.id}`);
    if (!Number.isNaN(disponivel) && (!Number.isInteger(disponivel) || disponivel < 0)) return { erro: `Quantidade disponível inválida para ${item.produto.nome}` };
    lidos.push({
      necessidadeId: item.id,
      precoUnitario: preco,
      quantidadeDisponivel: Number.isNaN(disponivel) ? item.quantidade : disponivel,
      quantidadeMinima: Number.isInteger(minima) && minima > 0 ? minima : 1,
    });
  }
  return { itens: lidos, nenhum: false };
}

/** Grava (ou substitui) a proposta de um fornecedor, com o preço de cada item. */
export async function salvarProposta(dados: {
  cotacaoId: number; fornecedorId: number; prazoEntregaDias: number; observacao: string | null; origem: Origem; itens: ItemDigitado[];
}) {
  const { cotacaoId, fornecedorId, itens, ...resto } = dados;
  return prisma.$transaction(async (tx) => {
    const p = await tx.proposta.upsert({
      where: { cotacaoId_fornecedorId: { cotacaoId, fornecedorId } },
      create: { cotacaoId, fornecedorId, ...resto },
      update: { ...resto, itens: { deleteMany: {} } },
    });
    await tx.itemProposta.createMany({ data: itens.map((i) => ({ ...i, propostaId: p.id })) });
    await tx.solicitacaoCotacao.updateMany({ where: { cotacaoId, fornecedorId }, data: { semItens: false } });
    return p;
  });
}

/** Registra que o fornecedor não possui nenhum dos itens: remove a proposta que ele tinha e marca a resposta. */
export async function registrarSemItens(cotacaoId: number, fornecedorId: number) {
  const agora = new Date();
  await prisma.$transaction([
    prisma.proposta.deleteMany({ where: { cotacaoId, fornecedorId } }),
    prisma.solicitacaoCotacao.upsert({
      where: { cotacaoId_fornecedorId: { cotacaoId, fornecedorId } },
      create: { cotacaoId, fornecedorId, token: randomBytes(24).toString("base64url"), semItens: true, respondidoEm: agora, visualizadoEm: agora },
      update: { semItens: true, respondidoEm: agora },
    }),
  ]);
}
