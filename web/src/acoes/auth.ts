"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { COOKIE_SESSAO, criarToken, obterSessao } from "@/lib/auth";
import { registrarLog } from "@/lib/log";
import { falhar, texto } from "./util";

const MAX_TENTATIVAS = 5;
const MINUTOS_TRAVADO = 15;

export async function entrar(fd: FormData) {
  const email = texto(fd, "email").toLowerCase();
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (usuario?.travadoAte && usuario.travadoAte > new Date()) {
    const minutos = Math.ceil((usuario.travadoAte.getTime() - Date.now()) / 60000);
    falhar("/login", `Muitas tentativas com senha errada. Tente de novo em ${minutos} minuto(s).`);
  }
  if (!usuario || !usuario.ativo || !(await bcrypt.compare(texto(fd, "senha"), usuario.senhaHash))) {
    if (usuario) {
      const tentativas = usuario.tentativasFalhas + 1;
      const travar = tentativas >= MAX_TENTATIVAS;
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { tentativasFalhas: travar ? 0 : tentativas, travadoAte: travar ? new Date(Date.now() + MINUTOS_TRAVADO * 60000) : null },
      });
      await registrarLog(usuario.id, travar ? "LOGIN_TRAVADO" : "LOGIN_FALHOU", "Usuario", usuario.id, `tentativa ${tentativas} de ${MAX_TENTATIVAS}`);
      if (travar) falhar("/login", `Senha errada ${MAX_TENTATIVAS} vezes seguidas. Por segurança, o acesso foi travado por ${MINUTOS_TRAVADO} minutos.`);
    }
    falhar("/login", "E-mail ou senha inválidos");
  }
  if (usuario.tentativasFalhas || usuario.travadoAte) {
    await prisma.usuario.update({ where: { id: usuario.id }, data: { tentativasFalhas: 0, travadoAte: null } });
  }
  const token = await criarToken({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil });
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && (process.env.APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: 8 * 3600,
  });
  await registrarLog(usuario.id, "LOGIN", "Usuario", usuario.id);
  redirect("/");
}

export async function sair() {
  const sessao = await obterSessao();
  if (sessao) await registrarLog(sessao.id, "LOGOUT", "Usuario", sessao.id);
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/login");
}
