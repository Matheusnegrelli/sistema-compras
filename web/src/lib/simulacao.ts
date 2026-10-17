import type { Fornecedor } from "@prisma/client";

type ItemSimulado = { necessidadeId: number; quantidade: number; precoReferencia: number };

/**
 * Simula o retorno de fornecedores a um pedido de cotação com vários itens (RF07).
 * Usado no protótipo no lugar da resposta real dos fornecedores pelo link.
 */
export function simularPropostas(fornecedores: Fornecedor[], itens: ItemSimulado[]) {
  const sorteados = [...fornecedores].sort(() => Math.random() - 0.5).slice(0, Math.min(5, fornecedores.length));
  return sorteados.map((f) => {
    // Fornecedores com histórico melhor tendem a cobrar um pouco mais e entregar mais rápido
    const fatorQualidade = f.notaHistorico / 5;
    const prazo = Math.max(1, Math.round(2 + Math.random() * 12 - fatorQualidade * 4));
    // Em pedidos com vários itens, às vezes o fornecedor não trabalha com algum deles
    let cotados = itens.filter(() => itens.length === 1 || Math.random() > 0.15);
    if (cotados.length === 0) cotados = [itens[0]];
    return {
      fornecedorId: f.id,
      prazoEntregaDias: prazo,
      origem: "SIMULADA" as const,
      observacao: "Proposta gerada pela simulação de cotação",
      itens: cotados.map((i) => {
        const preco = i.precoReferencia * (0.85 + Math.random() * 0.3 + fatorQualidade * 0.08);
        const atendeTudo = Math.random() < 0.75;
        const disponivel = atendeTudo
          ? i.quantidade + Math.round(Math.random() * i.quantidade)
          : Math.max(1, Math.round(i.quantidade * (0.4 + Math.random() * 0.5)));
        return {
          necessidadeId: i.necessidadeId,
          precoUnitario: Math.round(preco * 100) / 100,
          quantidadeDisponivel: disponivel,
          quantidadeMinima: Math.random() < 0.15 ? Math.round(i.quantidade * 1.5) : 1,
        };
      }),
    };
  });
}
