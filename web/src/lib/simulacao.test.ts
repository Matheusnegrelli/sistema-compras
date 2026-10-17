import { describe, expect, it } from "vitest";
import type { Fornecedor } from "@prisma/client";
import { formaValida } from "./pagamento";
import { simularPropostas } from "./simulacao";

const fornecedores = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, nome: `F${i + 1}`, notaHistorico: 3 + (i % 3) }) as Fornecedor);
const itens = [
  { necessidadeId: 1, quantidade: 100, precoReferencia: 10 },
  { necessidadeId: 2, quantidade: 20, precoReferencia: 50 },
];

describe("simularPropostas", () => {
  it("gera até 5 propostas válidas, cada uma com pelo menos um item", () => {
    const propostas = simularPropostas(fornecedores, itens);
    expect(propostas.length).toBe(5);
    for (const p of propostas) {
      expect(p.itens.length).toBeGreaterThan(0);
      expect(p.prazoEntregaDias).toBeGreaterThanOrEqual(1);
      expect(formaValida(p.formaPagamento)).toBe(true);
      for (const i of p.itens) {
        expect(i.precoUnitario).toBeGreaterThan(0);
        expect(i.quantidadeDisponivel).toBeGreaterThan(0);
      }
    }
  });
});
