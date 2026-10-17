/** Formas de pagamento que o fornecedor pode oferecer na proposta. */
export const FORMAS_PAGAMENTO = [
  { valor: "PIX", rotulo: "PIX à vista", dias: 0 },
  { valor: "TRANSFERENCIA", rotulo: "Transferência bancária à vista", dias: 0 },
  { valor: "BOLETO_28", rotulo: "Boleto para 28 dias", dias: 28 },
  { valor: "BOLETO_30_60", rotulo: "Boleto 30/60 dias (2 parcelas)", dias: 30 },
] as const;

export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]["valor"];

export function formaPagamento(valor: string | null | undefined) {
  return FORMAS_PAGAMENTO.find((f) => f.valor === valor) ?? FORMAS_PAGAMENTO[2];
}

export function formaValida(valor: string) {
  return FORMAS_PAGAMENTO.some((f) => f.valor === valor);
}

/** Data de vencimento (da 1ª parcela) contada a partir da aprovação. */
export function vencimento(aprovadoEm: Date, valor: string | null | undefined) {
  return new Date(aprovadoEm.getTime() + formaPagamento(valor).dias * 86_400_000);
}
