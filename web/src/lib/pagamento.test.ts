import { describe, expect, it } from "vitest";
import { FORMAS_PAGAMENTO, formaPagamento, formaValida, vencimento } from "./pagamento";

describe("forma de pagamento", () => {
  it("reconhece as formas oferecidas na proposta", () => {
    for (const f of FORMAS_PAGAMENTO) expect(formaValida(f.valor)).toBe(true);
    expect(formaValida("CHEQUE")).toBe(false);
  });

  it("usa boleto para 28 dias quando a forma não foi informada", () => {
    expect(formaPagamento(null).valor).toBe("BOLETO_28");
  });

  it("calcula o vencimento a partir da aprovação", () => {
    const aprovacao = new Date("2026-10-01T12:00:00Z");
    expect(vencimento(aprovacao, "PIX").toISOString()).toBe("2026-10-01T12:00:00.000Z");
    expect(vencimento(aprovacao, "BOLETO_28").toISOString()).toBe("2026-10-29T12:00:00.000Z");
  });
});
