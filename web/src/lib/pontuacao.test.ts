import { describe, expect, it } from "vitest";
import { classificarPropostas, normalizarPesos, quantidadeSugerida, notaDaEntrega, PropostaEntrada } from "./pontuacao";

const base: Omit<PropostaEntrada, "id" | "fornecedor"> = {
  precoUnitario: 10,
  prazoEntregaDias: 5,
  quantidadeDisponivel: 100,
  quantidadeMinima: 1,
  notaHistorico: 5,
};

describe("classificarPropostas", () => {
  it("dá 100 pontos para a proposta que é a melhor em todos os critérios", () => {
    const [primeira] = classificarPropostas(
      [
        { id: 1, fornecedor: "A", ...base },
        { id: 2, fornecedor: "B", ...base, precoUnitario: 12, prazoEntregaDias: 10 },
      ],
      50,
    );
    expect(primeira.id).toBe(1);
    expect(primeira.pontuacao).toBe(100);
  });

  it("não escolhe só pelo menor preço: prazo e histórico pesam", () => {
    const ranking = classificarPropostas(
      [
        { id: 1, fornecedor: "Barato e lento", ...base, precoUnitario: 9, prazoEntregaDias: 20, notaHistorico: 2 },
        { id: 2, fornecedor: "Rápido e confiável", ...base, precoUnitario: 10, prazoEntregaDias: 3, notaHistorico: 5 },
      ],
      50,
    );
    expect(ranking[0].fornecedor).toBe("Rápido e confiável");
    expect(ranking[1].alertas).toContain("Fornecedor com histórico baixo");
  });

  it("aplica os pesos padrão de 40/30/20/10", () => {
    const [, segunda] = classificarPropostas(
      [
        { id: 1, fornecedor: "A", ...base },
        { id: 2, fornecedor: "B", ...base, precoUnitario: 20, prazoEntregaDias: 10, quantidadeDisponivel: 25, notaHistorico: 2.5 },
      ],
      50,
    );
    // 0.5*40 + 0.5*30 + 0.5*20 + 0.5*10 = 50
    expect(segunda.pontuacao).toBe(50);
    expect(segunda.alertas[0]).toMatch(/parcialmente/);
  });

  it("permite que o gestor altere os pesos", () => {
    const propostas = [
      { id: 1, fornecedor: "Barato", ...base, precoUnitario: 8, prazoEntregaDias: 15 },
      { id: 2, fornecedor: "Rápido", ...base, precoUnitario: 10, prazoEntregaDias: 2 },
    ];
    expect(classificarPropostas(propostas, 10, { preco: 100, prazo: 0, disponibilidade: 0, historico: 0 })[0].fornecedor).toBe("Barato");
    expect(classificarPropostas(propostas, 10, { preco: 0, prazo: 100, disponibilidade: 0, historico: 0 })[0].fornecedor).toBe("Rápido");
  });

  it("calcula o valor total respeitando a quantidade mínima", () => {
    const [p] = classificarPropostas([{ id: 1, fornecedor: "A", ...base, quantidadeMinima: 80 }], 50);
    expect(p.valorTotal).toBe(800);
    expect(p.alertas[0]).toMatch(/mínima/);
  });

  it("retorna lista vazia sem propostas", () => {
    expect(classificarPropostas([], 10)).toEqual([]);
  });
});

describe("auxiliares", () => {
  it("normaliza pesos que não somam 100", () => {
    const p = normalizarPesos({ preco: 2, prazo: 1, disponibilidade: 1, historico: 0 });
    expect(p.preco).toBeCloseTo(0.5);
  });

  it("sugere repor até o dobro do mínimo", () => {
    expect(quantidadeSugerida(3, 10)).toBe(17);
    expect(quantidadeSugerida(3, 10, 50)).toBe(50);
  });

  it("penaliza entrega atrasada na nota do fornecedor", () => {
    expect(notaDaEntrega(5, true)).toBe(5);
    expect(notaDaEntrega(5, false)).toBe(4);
  });
});
