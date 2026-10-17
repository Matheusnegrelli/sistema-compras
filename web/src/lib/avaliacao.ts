import { prisma } from "./db";
import { classificarPropostas, type PropostaClassificada } from "./pontuacao";
import { obterPesos, paraAlgoritmo } from "./consultas";

/**
 * Validação da proposta (seção 5 do projeto): compara o processo manual com o automatizado.
 * Os tempos do processo manual são uma referência que o usuário pode ajustar na tela com os
 * valores levantados no hospital; os do processo automatizado são medidos nos dados do sistema.
 */
export const REFERENCIA_MANUAL_HORAS = {
  identificacao: 24, // conferência periódica do estoque e planilhas dos setores
  preparo: 2, // montar a lista de itens e enviar e-mails aos fornecedores
  comparacao: 3, // digitar as propostas em planilha e comparar
  pedido: 1, // emitir o pedido, avisar o financeiro e o fornecedor
};
export type ReferenciaManual = typeof REFERENCIA_MANUAL_HORAS;

export const ETAPAS_MANUAIS = [
  "Conferir o estoque de cada setor",
  "Identificar os itens abaixo do mínimo",
  "Montar a lista de compra",
  "Enviar e-mail a cada fornecedor",
  "Cobrar os fornecedores que não responderam",
  "Digitar as propostas em planilha",
  "Comparar preço, prazo e disponibilidade",
  "Escrever a justificativa da escolha",
  "Emitir e enviar o pedido de compra",
  "Avisar os fornecedores não escolhidos",
  "Enviar os dados de pagamento ao financeiro",
  "Avisar o fornecedor sobre o pagamento",
  "Dar entrada do material no estoque",
];

export const ETAPAS_SISTEMA = [
  "Revisar a quantidade sugerida (opcional)",
  "Selecionar a proposta e aprovar",
  "Pagar e registrar o pagamento",
  "Registrar o recebimento",
];

const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

export async function calcularAvaliacao() {
  const [decisoes, sincronizacoes, propostasPorOrigem, logs, emails, cotacoes, pesos] = await Promise.all([
    prisma.decisao.findMany({
      include: { cotacao: { include: { itens: { include: { produto: true } }, propostas: { include: { fornecedor: true, itens: true } } } } },
    }),
    prisma.sincronizacao.findMany(),
    prisma.proposta.groupBy({ by: ["origem"], _count: true }),
    prisma.log.count(),
    prisma.emailEnviado.count(),
    prisma.cotacao.count(),
    obterPesos(),
  ]);

  // H1: tempos medidos no sistema
  const syncOk = sincronizacoes.filter((s) => s.sucesso);
  const identificacaoMs = media(syncOk.map((s) => s.duracaoMs));
  const preparoMs = media(decisoes.map((d) => {
    const alerta = Math.min(...d.cotacao.itens.map((i) => i.criadoEm.getTime()), d.cotacao.criadoEm.getTime());
    return Math.max(0, d.cotacao.criadoEm.getTime() - alerta);
  }));
  const respostaMs = media(decisoes.filter((d) => d.cotacao.propostas.length).map((d) =>
    Math.max(0, Math.max(...d.cotacao.propostas.map((p) => p.criadoEm.getTime())) - d.cotacao.criadoEm.getTime())));
  // Tempo real do algoritmo para classificar as propostas de todas as cotações decididas
  const inicio = performance.now();
  for (const d of decisoes) {
    const { necessarios, entradas } = paraAlgoritmo(d.cotacao.itens, d.cotacao.propostas);
    classificarPropostas(entradas, necessarios, pesos);
  }
  const comparacaoMs = decisoes.length ? (performance.now() - inicio) / decisoes.length : 0;
  const pagamentoMs = media(decisoes.filter((d) => d.pagoEm).map((d) => d.pagoEm!.getTime() - d.decididoEm.getTime()));

  // H2: digitação e integração
  const totalPropostas = propostasPorOrigem.reduce((a, o) => a + o._count, 0);
  const digitadasComprador = propostasPorOrigem.find((o) => o.origem === "MANUAL")?._count ?? 0;
  const recebidas = decisoes.filter((d) => d.recebidoEm);
  const entradasAutomaticas = recebidas.reduce((a, d) => a + d.cotacao.itens.filter((i) => i.status === "ATENDIDA").length, 0);

  // H3: qualidade da decisão
  const seguiram = decisoes.filter((d) => d.seguiuRecomendacao).length;
  const divergencias = decisoes.filter((d) => !d.seguiuRecomendacao);
  const fornecedoresComparados = media(decisoes.map((d) => (d.ranking as unknown as PropostaClassificada[]).length));

  return {
    totalDecisoes: decisoes.length,
    tempos: { identificacaoMs, preparoMs, respostaMs, comparacaoMs, pagamentoMs },
    sincronizacoes: { total: sincronizacoes.length, falhas: sincronizacoes.length - syncOk.length },
    propostas: { total: totalPropostas, digitadasComprador },
    entradasAutomaticas,
    seguiram,
    divergencias: divergencias.length,
    divergenciasJustificadas: divergencias.filter((d) => d.justificativa).length,
    fornecedoresComparados,
    logs,
    emails,
    cotacoes,
  };
}
