import { prisma } from "./db";
import type { PropostaClassificada } from "./pontuacao";

/** Indicadores usados no dashboard e no relatório de resultados (H1 a H4). */
export async function calcularIndicadores() {
  const decisoes = await prisma.decisao.findMany({
    include: { cotacao: { include: { necessidade: { include: { produto: true } } } }, proposta: { include: { fornecedor: true } } },
    orderBy: { decididoEm: "desc" },
  });
  const sincronizacoes = await prisma.sincronizacao.findMany({ where: { sucesso: true }, orderBy: { iniciadoEm: "desc" }, take: 50 });

  let valorAprovado = 0;
  let economia = 0;
  let tempoTotalMs = 0;
  let somaPropostas = 0;
  const porFornecedor = new Map<string, number>();

  for (const d of decisoes) {
    const ranking = d.ranking as unknown as PropostaClassificada[];
    const escolhida = ranking.find((r) => r.id === d.propostaId);
    const valor = escolhida?.valorTotal ?? 0;
    valorAprovado += valor;
    // Economia em relação à proposta mais cara recebida (mesma quantidade comprada)
    if (escolhida && ranking.length > 1) {
      const maiorPreco = Math.max(...ranking.map((r) => r.precoUnitario));
      const qtd = escolhida.precoUnitario > 0 ? valor / escolhida.precoUnitario : 0;
      economia += (maiorPreco - escolhida.precoUnitario) * qtd;
    }
    somaPropostas += ranking.length;
    tempoTotalMs += d.decididoEm.getTime() - d.cotacao.necessidade.criadoEm.getTime();
    const nome = d.proposta.fornecedor.nome;
    porFornecedor.set(nome, (porFornecedor.get(nome) ?? 0) + valor);
  }

  const n = decisoes.length;
  return {
    decisoes,
    totalDecisoes: n,
    valorAprovado,
    economia,
    seguiramRecomendacao: decisoes.filter((d) => d.seguiuRecomendacao).length,
    tempoMedioAlertaDecisaoMs: n ? tempoTotalMs / n : 0,
    mediaPropostasPorCotacao: n ? somaPropostas / n : 0,
    tempoMedioSincronizacaoMs: sincronizacoes.length ? sincronizacoes.reduce((a, s) => a + s.duracaoMs, 0) / sincronizacoes.length : 0,
    totalSincronizacoes: await prisma.sincronizacao.count(),
    porFornecedor: [...porFornecedor.entries()].map(([nome, valor]) => ({ nome, valor: Math.round(valor * 100) / 100 })).sort((a, b) => b.valor - a.valor),
  };
}
