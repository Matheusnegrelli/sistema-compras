/**
 * Algoritmo de comparação das propostas (seção 4.5 do projeto).
 *
 * Uma cotação reúne os itens de uma mesma categoria e cada fornecedor responde com um preço
 * por item e um prazo único de entrega. Cada critério recebe uma nota de 0 a 1 e a pontuação
 * final é a soma ponderada, em uma escala de 0 a 100:
 *  - Preço:           custo dos itens cotados pelo menor preço de cada item / custo pela proposta
 *  - Prazo:           menor prazo da cotação / prazo da proposta
 *  - Disponibilidade: média, por item, de quantidade disponível / quantidade necessária (máx. 1;
 *                     item não cotado vale 0)
 *  - Histórico:       nota do fornecedor (0 a 5) / 5
 *
 * Com um único item, as fórmulas são as mesmas do projeto (menor preço / preço da proposta).
 * O resultado apenas indica a proposta mais vantajosa; a escolha final é do comprador.
 */

export type Pesos = { preco: number; prazo: number; disponibilidade: number; historico: number };

export const PESOS_PADRAO: Pesos = { preco: 40, prazo: 30, disponibilidade: 20, historico: 10 };

/** Item que a cotação precisa comprar. */
export type ItemNecessario = { necessidadeId: number; produto: string; quantidade: number };

/** Preço de um fornecedor para um item. */
export type ItemOfertado = { necessidadeId: number; precoUnitario: number; quantidadeDisponivel: number; quantidadeMinima: number };

export type PropostaEntrada = {
  id: number;
  fornecedor: string;
  prazoEntregaDias: number;
  notaHistorico: number;
  itens: ItemOfertado[];
};

export type Notas = { preco: number; prazo: number; disponibilidade: number; historico: number };

export type ItemCalculado = ItemOfertado & { quantidadeCompra: number; valor: number };

export type PropostaClassificada = PropostaEntrada & {
  posicao: number;
  pontuacao: number;
  notas: Notas;
  contribuicao: Notas;
  valorTotal: number;
  itensAtendidos: number;
  itensCalculados: ItemCalculado[];
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

/** Quantidade efetivamente comprada de um item: o necessário, limitado ao disponível e respeitando o mínimo. */
export function quantidadeCompra(necessaria: number, item: Pick<ItemOfertado, "quantidadeDisponivel" | "quantidadeMinima">) {
  return Math.max(Math.min(necessaria, item.quantidadeDisponivel), item.quantidadeMinima);
}

export function classificarPropostas(
  propostas: PropostaEntrada[],
  necessarios: ItemNecessario[],
  pesos: Pesos = PESOS_PADRAO,
): PropostaClassificada[] {
  if (propostas.length === 0 || necessarios.length === 0) return [];
  const p = normalizarPesos(pesos);
  const ofertados = (x: PropostaEntrada) => x.itens.filter((i) => i.precoUnitario > 0);
  const menorPrecoItem = new Map<number, number>();
  for (const prop of propostas) {
    for (const i of ofertados(prop)) {
      menorPrecoItem.set(i.necessidadeId, Math.min(menorPrecoItem.get(i.necessidadeId) ?? Infinity, i.precoUnitario));
    }
  }
  const menorPrazo = Math.min(...propostas.map((x) => Math.max(1, x.prazoEntregaDias)));

  const calculadas = propostas.map((proposta) => {
    const porItem = new Map(ofertados(proposta).map((i) => [i.necessidadeId, i]));
    let custoProposta = 0;
    let custoMelhor = 0;
    let somaDisponibilidade = 0;
    const alertas: string[] = [];
    const itensCalculados: ItemCalculado[] = [];

    for (const n of necessarios) {
      const item = porItem.get(n.necessidadeId);
      if (!item) {
        alertas.push(`Não possui ${n.produto}`);
        continue;
      }
      custoProposta += item.precoUnitario * n.quantidade;
      custoMelhor += (menorPrecoItem.get(n.necessidadeId) ?? item.precoUnitario) * n.quantidade;
      somaDisponibilidade += n.quantidade > 0 ? Math.min(1, item.quantidadeDisponivel / n.quantidade) : 1;
      if (item.quantidadeDisponivel < n.quantidade) {
        alertas.push(`${n.produto}: atende parcialmente (${item.quantidadeDisponivel} de ${n.quantidade})`);
      }
      if (item.quantidadeMinima > n.quantidade) {
        alertas.push(`${n.produto}: exige compra mínima de ${item.quantidadeMinima} unidades`);
      }
      const qtd = quantidadeCompra(n.quantidade, item);
      itensCalculados.push({ ...item, quantidadeCompra: qtd, valor: arredondar(qtd * item.precoUnitario) });
    }
    if (proposta.notaHistorico < 2.5) alertas.push("Fornecedor com histórico baixo");

    const notas: Notas = {
      preco: custoProposta > 0 ? custoMelhor / custoProposta : 0,
      prazo: menorPrazo / Math.max(1, proposta.prazoEntregaDias),
      disponibilidade: somaDisponibilidade / necessarios.length,
      historico: Math.min(5, Math.max(0, proposta.notaHistorico)) / 5,
    };
    const contribuicao: Notas = {
      preco: notas.preco * p.preco * 100,
      prazo: notas.prazo * p.prazo * 100,
      disponibilidade: notas.disponibilidade * p.disponibilidade * 100,
      historico: notas.historico * p.historico * 100,
    };
    const pontuacao = contribuicao.preco + contribuicao.prazo + contribuicao.disponibilidade + contribuicao.historico;

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
      valorTotal: arredondar(itensCalculados.reduce((a, i) => a + i.valor, 0)),
      itensAtendidos: itensCalculados.length,
      itensCalculados,
      alertas,
    };
  });

  // Maior pontuação primeiro; em caso de empate, menor valor total e depois menor prazo
  calculadas.sort(
    (a, b) => b.pontuacao - a.pontuacao || a.valorTotal - b.valorTotal || a.prazoEntregaDias - b.prazoEntregaDias,
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
