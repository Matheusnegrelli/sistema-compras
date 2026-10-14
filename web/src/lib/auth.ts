import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Perfil } from "@prisma/client";
import { prisma } from "./db";
import { COOKIE_SESSAO, lerToken, type Sessao } from "./token";

export { COOKIE_SESSAO, criarToken, type Sessao } from "./token";

/**
 * Lê a sessão do cookie e confere o usuário no banco. Assim, um login antigo (por exemplo,
 * depois de recarregar os dados com o seed) ou de um usuário desativado não é aceito.
 */
export async function obterSessao(): Promise<Sessao | null> {
  const jar = await cookies();
  const token = await lerToken(jar.get(COOKIE_SESSAO)?.value);
  if (!token) return null;
  const usuario = await prisma.usuario.findUnique({ where: { id: token.id } });
  if (!usuario || !usuario.ativo || usuario.email !== token.email) return null;
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
}

/** Perfis que herdam as permissões de outro (o gestor também pode executar tarefas do comprador). */
const HERDA: Record<Perfil, Perfil[]> = { ADMIN: ["ADMIN", "GESTOR", "COMPRADOR"], GESTOR: ["GESTOR", "COMPRADOR"], COMPRADOR: ["COMPRADOR"] };

/** Exige usuário logado e, opcionalmente, um dos perfis informados (ADMIN sempre pode). */
export async function exigirSessao(...perfis: Perfil[]): Promise<Sessao> {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  if (perfis.length && !perfis.some((p) => HERDA[sessao.perfil].includes(p))) {
    throw new Error("Seu perfil não tem permissão para esta ação.");
  }
  return sessao;
}

export function podeAprovar(perfil: Perfil) {
  return perfil === "GESTOR" || perfil === "ADMIN";
}
