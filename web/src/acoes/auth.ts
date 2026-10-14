"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { COOKIE_SESSAO, criarToken, obterSessao } from "@/lib/auth";
import { registrarLog } from "@/lib/log";
import { falhar, texto } from "./util";

export async function entrar(fd: FormData) {
  const email = texto(fd, "email").toLowerCase();
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.ativo || !(await bcrypt.compare(texto(fd, "senha"), usuario.senhaHash))) {
    falhar("/login", "E-mail ou senha inválidos");
  }
  const token = await criarToken({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil });
  (await cookies()).set(COOKIE_SESSAO, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 8 * 3600 });
  await registrarLog(usuario.id, "LOGIN", "Usuario", usuario.id);
  redirect("/");
}

export async function sair() {
  const sessao = await obterSessao();
  if (sessao) await registrarLog(sessao.id, "LOGOUT", "Usuario", sessao.id);
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/login");
}
