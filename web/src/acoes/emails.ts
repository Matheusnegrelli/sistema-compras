"use server";

import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { reenviarEmail } from "@/lib/email";
import { registrarLog } from "@/lib/log";
import { falhar, numero, sucesso } from "./util";

/** Reenvia um e-mail que falhou ou ficou preso em "Enviando…". */
export async function reenviarEmailAcao(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const id = numero(fd, "id");
  let resultado;
  try {
    resultado = await reenviarEmail(id);
  } catch (e) {
    falhar("/emails", e instanceof Error ? e.message : String(e));
  }
  await registrarLog(sessao.id, "EMAIL_REENVIADO", "EmailEnviado", id, resultado.status);
  revalidatePath("/emails");
  if (resultado.status === "ENVIADO") sucesso("/emails", `E-mail reenviado para ${resultado.para}`);
  falhar("/emails", `O reenvio falhou: ${resultado.erro ?? "erro desconhecido"}`);
}
