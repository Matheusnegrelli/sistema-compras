import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { classificarPropostas, PESOS_PADRAO, type ItemNecessario, type Pesos, type PropostaEntrada } from "./pontuacao";

export async function obterPesos(): Promise<Pesos> {
  const c = await prisma.configuracaoPesos.findUnique({ where: { id: 1 } });
  return c ? { preco: c.preco, prazo: c.prazo, disponibilidade: c.disponibilidade, historico: c.historico } : PESOS_PADRAO;
}

type PropostaComItens = Prisma.PropostaGetPayload<{ include: { fornecedor: true; itens: true } }>;
type ItemComProduto = { id: number; quantidade: number; produto: { nome: string } };

/** Converte os itens da cotação e as propostas do banco para o formato do algoritmo. */
export function paraAlgoritmo(itens: ItemComProduto[], propostas: PropostaComItens[]) {
  const necessarios: ItemNecessario[] = itens.map((i) => ({ necessidadeId: i.id, produto: i.produto.nome, quantidade: i.quantidade }));
  const entradas: PropostaEntrada[] = propostas.map((p) => ({
    id: p.id,
    fornecedor: p.fornecedor.nome,
    prazoEntregaDias: p.prazoEntregaDias,
    notaHistorico: p.fornecedor.notaHistorico,
    itens: p.itens.map((i) => ({
      necessidadeId: i.necessidadeId,
      precoUnitario: i.precoUnitario,
      quantidadeDisponivel: i.quantidadeDisponivel,
      quantidadeMinima: i.quantidadeMinima,
    })),
  }));
  return { necessarios, entradas };
}

/** Carrega a cotação (itens da categoria) com as propostas já classificadas pelo algoritmo. */
export async function carregarCotacao(id: number) {
  const cotacao = await prisma.cotacao.findUnique({
    where: { id },
    include: {
      itens: { include: { produto: { include: { setor: true } } }, orderBy: { id: "asc" } },
      propostas: { include: { fornecedor: true, itens: true }, orderBy: { criadoEm: "asc" } },
      decisao: { include: { gestor: true, proposta: { include: { fornecedor: true } } } },
      criadoPor: true,
      solicitacoes: { include: { fornecedor: true }, orderBy: { fornecedor: { nome: "asc" } } },
    },
  });
  if (!cotacao) return null;
  const pesos = await obterPesos();
  const { necessarios, entradas } = paraAlgoritmo(cotacao.itens, cotacao.propostas);
  const ranking = classificarPropostas(entradas, necessarios, pesos);
  return { cotacao, ranking, pesos, necessarios, entradas };
}

export async function listarSetores() {
  return prisma.setor.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true, sigla: true } });
}

/** Converte o parâmetro ?setor= em id numérico (ou undefined para todos). */
export function setorDoFiltro(valor?: string) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** Itens comprados nesta cotação, em texto curto (ex.: "Dipirona, Omeprazol"). */
export function resumoItens(itens: { produto: { nome: string } }[], max = 2) {
  const nomes = itens.map((i) => i.produto.nome);
  return nomes.length <= max ? nomes.join(", ") : `${nomes.slice(0, max).join(", ")} e mais ${nomes.length - max}`;
}
