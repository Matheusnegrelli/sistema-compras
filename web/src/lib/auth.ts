import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Perfil } from "@prisma/client";
import { COOKIE_SESSAO, lerToken, type Sessao } from "./token";

export { COOKIE_SESSAO, criarToken, type Sessao } from "./token";
export async function obterSessao() {
  const jar = await cookies();
  return lerToken(jar.get(COOKIE_SESSAO)?.value);
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
