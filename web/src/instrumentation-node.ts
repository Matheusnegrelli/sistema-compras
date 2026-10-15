import { sincronizarEstoque } from "./lib/sincronizacao";

/** Agenda a rotina automática de verificação de estoque (só no runtime Node.js). */
export function agendarRotinaEstoque() {
  const minutos = Number(process.env.SYNC_INTERVALO_MIN || "5");
  if (!minutos || minutos <= 0) return;
  const g = globalThis as unknown as { __rotinaEstoque?: NodeJS.Timeout };
  if (g.__rotinaEstoque) return;
  g.__rotinaEstoque = setInterval(() => {
    sincronizarEstoque("AUTOMATICA").catch((e) => console.error("Rotina de estoque falhou", e));
  }, minutos * 60_000);
  console.log(`Rotina automática de estoque a cada ${minutos} min`);
}
