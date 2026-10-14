import { prisma } from "./db";

/** Registra as operações principais do sistema (RNF03). */
export async function registrarLog(
  usuarioId: number | null | undefined,
  acao: string,
  entidade: string,
  entidadeId?: number | null,
  detalhes?: string,
) {
  try {
    await prisma.log.create({ data: { usuarioId: usuarioId ?? null, acao, entidade, entidadeId: entidadeId ?? null, detalhes } });
  } catch (erro) {
    console.error("Falha ao registrar log", erro);
  }
}
