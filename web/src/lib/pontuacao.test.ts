import { describe, expect, it } from "vitest";
import { classificarPropostas, normalizarPesos, quantidadeSugerida, notaDaEntrega, type PropostaEntrada } from "./pontuacao";

// Cotação de um único item (como no projeto original)
const ITEM = [{ necessidadeId: 1, produto: "Luva", quantidade: 50 }];
function umItem(id: number, fornecedor: string, o: { preco?: number; prazo?: number; disponivel?: number; minima?: number; nota?: number } = {}): PropostaEntrada {
  return {
    id, fornecedor, prazoEntregaDias: o.prazo ?? 5, notaHistorico: o.nota ?? 5,
    itens: [{ necessidadeId: 1, precoUnitario: o.preco ?? 10, quantidadeDisponivel: o.disponivel ?? 100, quantidadeMinima: o.minima ?? 1 }],
  };
}

describe("classificarPropostas (um item)", () => {
  it("dá 100 pontos para a proposta que é a melhor em todos os critérios", () => {
    const [primeira] = classificarPropostas([umItem(1, "A"), umItem(2, "B", { preco: 12, prazo: 10 })], ITEM);
    expect(primeira.id).toBe(1);
    expect(primeira.pontuacao).toBe(100);
  });

  it("não escolhe só pelo menor preço: prazo e histórico pesam", () => {
    const ranking = classificarPropostas(
      [umItem(1, "Barato e lento", { preco: 9, prazo: 20, nota: 2 }), umItem(2, "Rápido e confiável", { preco: 10, prazo: 3 })],
      ITEM,
    );
    expect(ranking[0].fornecedor).toBe("Rápido e confiável");
    expect(ranking[1].alertas).toContain("Fornecedor com histórico baixo");
  });

  it("aplica os pesos padrão de 40/30/20/10", () => {
    const [, segunda] = classificarPropostas(
      [umItem(1, "A"), umItem(2, "B", { preco: 20, prazo: 10, disponivel: 25, nota: 2.5 })],
      ITEM,
    );
    // 0.5*40 + 0.5*30 + 0.5*20 + 0.5*10 = 50
    expect(segunda.pontuacao).toBe(50);
    expect(segunda.alertas[0]).toMatch(/parcialmente/);
  });

  it("permite que o gestor altere os pesos", () => {
    const propostas = [umItem(1, "Barato", { preco: 8, prazo: 15 }), umItem(2, "Rápido", { preco: 10, prazo: 2 })];
    expect(classificarPropostas(propostas, ITEM, { preco: 100, prazo: 0, disponibilidade: 0, historico: 0 })[0].fornecedor).toBe("Barato");
    expect(classificarPropostas(propostas, ITEM, { preco: 0, prazo: 100, disponibilidade: 0, historico: 0 })[0].fornecedor).toBe("Rápido");
  });

  it("calcula o valor total respeitando a quantidade mínima", () => {
    const [p] = classificarPropostas([umItem(1, "A", { minima: 80 })], ITEM);
    expect(p.valorTotal).toBe(800);
    expect(p.alertas[0]).toMatch(/mínima/);
  });

  it("retorna lista vazia sem propostas", () => {
    expect(classificarPropostas([], ITEM)).toEqual([]);
  });
});

describe("classificarPropostas (cotação por categoria, vários itens)", () => {
  const itens = [
    { necessidadeId: 1, produto: "Dipirona", quantidade: 100 },
    { necessidadeId: 2, produto: "Omeprazol", quantidade: 10 },
  ];
  const oferta = (necessidadeId: number, precoUnitario: number) => ({ necessidadeId, precoUnitario, quantidadeDisponivel: 1000, quantidadeMinima: 1 });

  it("compara o custo do pedido inteiro, item a item", () => {
    const ranking = classificarPropostas(
      [
        { id: 1, fornecedor: "A", prazoEntregaDias: 5, notaHistorico: 5, itens: [oferta(1, 1), oferta(2, 10)] }, // 100 + 100 = 200
        { id: 2, fornecedor: "B", prazoEntregaDias: 5, notaHistorico: 5, itens: [oferta(1, 2), oferta(2, 5)] }, // 200 + 50 = 250
      ],
      itens,
    );
    expect(ranking[0].fornecedor).toBe("A");
    expect(ranking[0].valorTotal).toBe(200);
    // melhor custo possível: 1*100 + 5*10 = 150
    expect(ranking[0].notas.preco).toBeCloseTo(0.75);
    expect(ranking[1].notas.preco).toBeCloseTo(0.6);
  });

  it("penaliza o fornecedor que não cota todos os itens", () => {
    const ranking = classificarPropostas(
      [
        { id: 1, fornecedor: "Completo", prazoEntregaDias: 5, notaHistorico: 5, itens: [oferta(1, 1), oferta(2, 10)] },
        { id: 2, fornecedor: "Parcial", prazoEntregaDias: 5, notaHistorico: 5, itens: [oferta(1, 1)] },
      ],
      itens,
    );
    const parcial = ranking.find((r) => r.fornecedor === "Parcial")!;
    expect(parcial.notas.disponibilidade).toBe(0.5);
    expect(parcial.itensAtendidos).toBe(1);
    expect(parcial.alertas).toContain("Não possui Omeprazol");
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

describe("análise de sensibilidade dos pesos", () => {
  const propostas = [
    umItem(1, "Barato", { preco: 8, prazo: 15, nota: 3 }),
    umItem(2, "Rápido", { preco: 11, prazo: 2, nota: 4 }),
    umItem(3, "Confiável", { preco: 10, prazo: 8, nota: 5 }),
  ];

  it("a recomendação muda conforme a prioridade do hospital", () => {
    expect(classificarPropostas(propostas, ITEM, { preco: 80, prazo: 10, disponibilidade: 5, historico: 5 })[0].fornecedor).toBe("Barato");
    expect(classificarPropostas(propostas, ITEM, { preco: 10, prazo: 80, disponibilidade: 5, historico: 5 })[0].fornecedor).toBe("Rápido");
  });

  it("a pontuação não depende da escala dos pesos, só da proporção", () => {
    const a = classificarPropostas(propostas, ITEM, { preco: 4, prazo: 3, disponibilidade: 2, historico: 1 });
    const b = classificarPropostas(propostas, ITEM, { preco: 40, prazo: 30, disponibilidade: 20, historico: 10 });
    expect(a.map((r) => r.pontuacao)).toEqual(b.map((r) => r.pontuacao));
  });

  it("a soma das contribuições por critério é a pontuação final", () => {
    for (const r of classificarPropostas(propostas, ITEM)) {
      const soma = Object.values(r.contribuicao).reduce((x, y) => x + y, 0);
      expect(Math.abs(soma - r.pontuacao)).toBeLessThan(0.11);
    }
  });
});
