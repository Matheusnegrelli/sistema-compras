import { SignJWT, jwtVerify } from "jose";
import type { Perfil } from "@prisma/client";

export const COOKIE_SESSAO = "sessao";

export type Sessao = { id: number; nome: string; email: string; perfil: Perfil };

function chave() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "chave-de-desenvolvimento");
}

export async function criarToken(sessao: Sessao) {
  return new SignJWT(sessao).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(chave());
}

export async function lerToken(token?: string): Promise<Sessao | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave());
    return payload as unknown as Sessao;
  } catch {
    return null;
  }
}
