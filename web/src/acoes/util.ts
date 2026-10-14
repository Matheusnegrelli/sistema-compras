import { redirect } from "next/navigation";

export function texto(fd: FormData, campo: string) {
  return String(fd.get(campo) ?? "").trim();
}

export function numero(fd: FormData, campo: string) {
  const bruto = texto(fd, campo).replace(",", ".");
  return bruto === "" ? NaN : Number(bruto);
}

/** Volta para a página informando erro de validação (exibido pelo componente Aviso). */
export function falhar(caminho: string, mensagem: string): never {
  const sep = caminho.includes("?") ? "&" : "?";
  redirect(`${caminho}${sep}erro=${encodeURIComponent(mensagem)}`);
}

export function sucesso(caminho: string, mensagem: string): never {
  const sep = caminho.includes("?") ? "&" : "?";
  redirect(`${caminho}${sep}ok=${encodeURIComponent(mensagem)}`);
}
