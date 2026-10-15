/**
 * Algoritmo de comparação das propostas (seção 4.5 do projeto).
 *
 * Cada critério recebe uma nota de 0 a 1 e a pontuação final é a soma ponderada,
 * em uma escala de 0 a 100:
 *  - Preço:           menor preço da cotação / preço da proposta
 *  - Prazo:           menor prazo da cotação / prazo da proposta
 *  - Disponibilidade: quantidade disponível / quantidade necessária (limitado a 1)
 *  - Histórico:       nota do fornecedor (0 a 5) / 5
 *
 * O resultado apenas indica a proposta mais vantajosa; a escolha final é do comprador.
 */

export type Pesos = { preco: number; prazo: number; disponibilidade: number; historico: number };

export const PESOS_PADRAO: Pesos = { preco: 40, prazo: 30, disponibilidade: 20, historico: 10 };

export type PropostaEntrada = {
  id: number;
  fornecedor: string;
  precoUnitario: number;
  prazoEntregaDias: number;
  quantidadeDisponivel: number;
  quantidadeMinima: number;
  notaHistorico: number;
};

export type Notas = { preco: number; prazo: number; disponibilidade: number; historico: number };

export type PropostaClassificada = PropostaEntrada & {
  posicao: number;
  pontuacao: number;
  notas: Notas;
  contribuicao: Notas;
  valorTotal: number;
  alertas: string[];
};

function arredondar(valor: number, casas = 2) {
  const f = 10 ** casas;
  return Math.round(valor * f) / f;
}

export function normalizarPesos(pesos: Pesos): Pesos {
  const soma = pesos.preco + pesos.prazo + pesos.disponibilidade + pesos.historico;
  if (soma <= 0) return normalizarPesos(PESOS_PADRAO);
  return {
    preco: pesos.preco / soma,
    prazo: pesos.prazo / soma,
    disponibilidade: pesos.disponibilidade / soma,
    historico: pesos.historico / soma,
  };
}

export function classificarPropostas(
  propostas: PropostaEntrada[],
  quantidadeNecessaria: number,
  pesos: Pesos = PESOS_PADRAO,
): PropostaClassificada[] {
  if (propostas.length === 0) return [];
  const p = normalizarPesos(pesos);
  const menorPreco = Math.min(...propostas.map((x) => x.precoUnitario));
  const menorPrazo = Math.min(...propostas.map((x) => Math.max(1, x.prazoEntregaDias)));

  const calculadas = propostas.map((proposta) => {
    const notas: Notas = {
      preco: proposta.precoUnitario > 0 ? menorPreco / proposta.precoUnitario : 0,
      prazo: menorPrazo / Math.max(1, proposta.prazoEntregaDias),
      disponibilidade:
        quantidadeNecessaria > 0 ? Math.min(1, proposta.quantidadeDisponivel / quantidadeNecessaria) : 1,
      historico: Math.min(5, Math.max(0, proposta.notaHistorico)) / 5,
    };
    const contribuicao: Notas = {
      preco: notas.preco * p.preco * 100,
      prazo: notas.prazo * p.prazo * 100,
      disponibilidade: notas.disponibilidade * p.disponibilidade * 100,
      historico: notas.historico * p.historico * 100,
    };
    const pontuacao = contribuicao.preco + contribuicao.prazo + contribuicao.disponibilidade + contribuicao.historico;

    const alertas: string[] = [];
    if (proposta.quantidadeDisponivel < quantidadeNecessaria) {
      alertas.push(`Atende parcialmente (${proposta.quantidadeDisponivel} de ${quantidadeNecessaria})`);
    }
    if (proposta.quantidadeMinima > quantidadeNecessaria) {
      alertas.push(`Exige compra mínima de ${proposta.quantidadeMinima} unidades`);
    }
    if (proposta.notaHistorico < 2.5) alertas.push("Fornecedor com histórico baixo");

    const quantidadeCompra = Math.max(Math.min(quantidadeNecessaria, proposta.quantidadeDisponivel), proposta.quantidadeMinima);

    return {
      ...proposta,
      posicao: 0,
      pontuacao: arredondar(pontuacao),
      notas: {
        preco: arredondar(notas.preco, 3),
        prazo: arredondar(notas.prazo, 3),
        disponibilidade: arredondar(notas.disponibilidade, 3),
        historico: arredondar(notas.historico, 3),
      },
      contribuicao: {
        preco: arredondar(contribuicao.preco),
        prazo: arredondar(contribuicao.prazo),
        disponibilidade: arredondar(contribuicao.disponibilidade),
        historico: arredondar(contribuicao.historico),
      },
      valorTotal: arredondar(quantidadeCompra * proposta.precoUnitario),
      alertas,
    };
  });

  // Maior pontuação primeiro; em caso de empate, menor preço e depois menor prazo
  calculadas.sort(
    (a, b) =>
      b.pontuacao - a.pontuacao || a.precoUnitario - b.precoUnitario || a.prazoEntregaDias - b.prazoEntregaDias,
  );
  return calculadas.map((c, i) => ({ ...c, posicao: i + 1 }));
}

/** Quantidade sugerida para compra quando o produto fica abaixo do mínimo. */
export function quantidadeSugerida(estoqueAtual: number, estoqueMinimo: number, quantidadeReposicao?: number | null) {
  if (quantidadeReposicao && quantidadeReposicao > 0) return quantidadeReposicao;
  // Repõe até o dobro do estoque mínimo
  return Math.max(1, estoqueMinimo * 2 - estoqueAtual);
}

/** Nova nota de histórico do fornecedor a partir das avaliações de entrega. */
export function notaDaEntrega(avaliacao: number, entregueNoPrazo: boolean) {
  return Math.max(0, Math.min(5, avaliacao - (entregueNoPrazo ? 0 : 1)));
}
