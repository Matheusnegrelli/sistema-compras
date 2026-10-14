import type { Fornecedor } from "@prisma/client";

/**
 * Simula o retorno de fornecedores a uma solicitação de cotação (RF07).
 * Usado no protótipo no lugar do envio real de e-mails/portal de fornecedores.
 */
export function simularPropostas(fornecedores: Fornecedor[], quantidade: number, precoReferencia: number) {
  const sorteados = [...fornecedores].sort(() => Math.random() - 0.5).slice(0, Math.min(5, fornecedores.length));
  return sorteados.map((f) => {
    // Fornecedores com histórico melhor tendem a cobrar um pouco mais e entregar mais rápido
    const fatorQualidade = f.notaHistorico / 5;
    const preco = precoReferencia * (0.85 + Math.random() * 0.3 + fatorQualidade * 0.08);
    const prazo = Math.max(1, Math.round(2 + Math.random() * 12 - fatorQualidade * 4));
    const atendeTudo = Math.random() < 0.7;
    const disponivel = atendeTudo ? quantidade + Math.round(Math.random() * quantidade) : Math.max(1, Math.round(quantidade * (0.4 + Math.random() * 0.5)));
    const minima = Math.random() < 0.2 ? Math.round(quantidade * 1.5) : 1;
    return {
      fornecedorId: f.id,
      precoUnitario: Math.round(preco * 100) / 100,
      prazoEntregaDias: prazo,
      quantidadeDisponivel: disponivel,
      quantidadeMinima: minima,
      origem: "SIMULADA" as const,
      observacao: "Proposta gerada pela simulação de cotação",
    };
  });
}
