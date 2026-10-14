/** Cliente da API de Estoque (real ou simulada), configurado por variáveis de ambiente. */

export type ItemEstoque = { sku: string; descricao: string; unidade: string; quantidade: number; atualizadoEm: string };

const URL_BASE = () => process.env.ESTOQUE_API_URL || "http://localhost:4000";

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${URL_BASE()}${caminho}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: { "content-type": "application/json", "x-api-key": process.env.ESTOQUE_API_KEY || "", ...init?.headers },
  });
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(corpo?.erro || `API de estoque respondeu ${resp.status}`);
  return corpo as T;
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

export async function simularConsumo() {
  return chamar<{ alterados: { sku: string; saida: number; saldo: number }[] }>("/api/v1/simulacao/consumo", { method: "POST" });
}

export async function statusApi() {
  try {
    const resp = await fetch(`${URL_BASE()}/health`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}
