/** Cliente da API de Estoque (real ou simulada), configurado por variáveis de ambiente. */

export type ItemEstoque = { sku: string; descricao: string; setor?: string; unidade: string; quantidade: number; atualizadoEm: string };

const URL_BASE = () => process.env.ESTOQUE_API_URL || "http://localhost:4000";

const ACORDANDO = new Set([502, 503, 504]);
const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/**
 * No plano gratuito do Render a API "dorme" sem uso e leva até um minuto para acordar, respondendo 502/503
 * nesse intervalo. Por isso a chamada tenta de novo algumas vezes antes de mostrar o erro.
 */
async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const pausas = [0, 5_000, 10_000, 15_000, 20_000];
  let ultimoErro: Error = new Error("API de estoque indisponível");
  for (const pausa of pausas) {
    if (pausa) await esperar(pausa);
    let resp: Response;
    try {
      resp = await fetch(`${URL_BASE()}${caminho}`, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
        headers: { "content-type": "application/json", "x-api-key": process.env.ESTOQUE_API_KEY || "", ...init?.headers },
      });
    } catch (e) {
      ultimoErro = e instanceof Error ? e : new Error(String(e));
      continue;
    }
    const corpo = await resp.json().catch(() => ({}));
    if (resp.ok) return corpo as T;
    ultimoErro = new Error(corpo?.erro || `API de estoque respondeu ${resp.status}`);
    if (!ACORDANDO.has(resp.status)) throw ultimoErro;
  }
  throw new Error(`${ultimoErro.message}. A API pode estar iniciando; tente de novo em um minuto.`);
}

export async function listarEstoque() {
  const r = await chamar<{ itens: ItemEstoque[] }>("/api/v1/estoque");
  return r.itens;
}

export async function registrarEntrada(sku: string, quantidade: number, motivo: string) {
  return chamar(`/api/v1/estoque/${encodeURIComponent(sku)}/movimentos`, {
    method: "POST",
    body: JSON.stringify({ tipo: "ENTRADA", quantidade, motivo }),
  });
}

/** Volta o estoque da API aos saldos iniciais (usado ao restaurar os dados de demonstração). */
export async function restaurarEstoque() {
  return chamar<{ ok: boolean; itens: number }>("/api/v1/simulacao/reset", { method: "POST" });
}

export async function simularConsumo() {
  return chamar<{ alterados: { sku: string; saida: number; saldo: number }[] }>("/api/v1/simulacao/consumo", { method: "POST" });
}

export async function statusApi() {
  try {
    const resp = await fetch(`${URL_BASE()}/health`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    return resp.ok;
  } catch {
    return false;
  }
}
