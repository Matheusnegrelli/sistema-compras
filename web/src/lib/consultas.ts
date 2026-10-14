import { prisma } from "./db";
import { classificarPropostas, PESOS_PADRAO, type Pesos } from "./pontuacao";

export async function obterPesos(): Promise<Pesos> {
  const c = await prisma.configuracaoPesos.findUnique({ where: { id: 1 } });
  return c ? { preco: c.preco, prazo: c.prazo, disponibilidade: c.disponibilidade, historico: c.historico } : PESOS_PADRAO;
}

/** Carrega a cotação com as propostas já classificadas pelo algoritmo. */
export async function carregarCotacao(id: number) {
  const cotacao = await prisma.cotacao.findUnique({
    where: { id },
    include: {
      necessidade: { include: { produto: true } },
      propostas: { include: { fornecedor: true }, orderBy: { criadoEm: "asc" } },
      decisao: { include: { gestor: true, proposta: { include: { fornecedor: true } } } },
      criadoPor: true,
    },
  });
  if (!cotacao) return null;
  const pesos = await obterPesos();
  const ranking = classificarPropostas(
    cotacao.propostas.map((p) => ({
      id: p.id,
      fornecedor: p.fornecedor.nome,
      precoUnitario: p.precoUnitario,
      prazoEntregaDias: p.prazoEntregaDias,
      quantidadeDisponivel: p.quantidadeDisponivel,
      quantidadeMinima: p.quantidadeMinima,
      notaHistorico: p.fornecedor.notaHistorico,
    })),
    cotacao.necessidade.quantidade,
    pesos,
  );
  return { cotacao, ranking, pesos };
}
