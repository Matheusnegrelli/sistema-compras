import { describe, expect, it } from "vitest";
import { lerItensDoFormulario } from "./propostas";

const ITENS = [
  { id: 1, quantidade: 100, produto: { nome: "Luva" } },
  { id: 2, quantidade: 40, produto: { nome: "Máscara" } },
];
const form = (campos: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
};

describe("lerItensDoFormulario (resposta do fornecedor)", () => {
  it("lê preço com vírgula e usa a quantidade necessária quando o disponível fica em branco", () => {
    const r = lerItensDoFormulario(form({ preco_1: "12,50", preco_2: "3" }), ITENS);
    expect(r.itens).toEqual([
      { necessidadeId: 1, precoUnitario: 12.5, quantidadeDisponivel: 100, quantidadeMinima: 1 },
      { necessidadeId: 2, precoUnitario: 3, quantidadeDisponivel: 40, quantidadeMinima: 1 },
    ]);
  });

  it("ignora o item marcado como \"Não tenho\"", () => {
    const r = lerItensDoFormulario(form({ preco_1: "12", sem_2: "on" }), ITENS);
    expect(r.itens?.map((i) => i.necessidadeId)).toEqual([1]);
    expect(r.nenhum).toBe(false);
  });

  it("exige preço ou \"Não tenho\" em cada item", () => {
    const r = lerItensDoFormulario(form({ preco_1: "12" }), ITENS);
    expect(r.erro).toMatch(/Máscara/);
  });

  it("entende que o fornecedor não tem nenhum item", () => {
    expect(lerItensDoFormulario(form({ sem_1: "on", sem_2: "on" }), ITENS).nenhum).toBe(true);
    expect(lerItensDoFormulario(form({ nenhum: "1" }), ITENS).nenhum).toBe(true);
  });

  it("recusa preço zero ou negativo", () => {
    expect(lerItensDoFormulario(form({ preco_1: "0", sem_2: "on" }), ITENS).erro).toMatch(/Preço inválido/);
  });
});
