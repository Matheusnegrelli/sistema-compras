import { prisma } from "./db";
import { listarEstoque } from "./estoque-api";
import { registrarLog } from "./log";
import { quantidadeSugerida } from "./pontuacao";
import { abrirCotacao, obterConfiguracaoEnvio } from "./solicitacoes";

export type ResultadoSincronizacao = {
  sucesso: boolean;
  itensLidos: number;
  itensAtualizados: number;
  alertasGerados: number;
  cotacoesEnviadas: number;
  naoCadastrados: string[];
  duracaoMs: number;
  erro?: string;
};

/**
 * Rotina de identificação automática de itens abaixo do estoque mínimo (RF04, RF05, RF06).
 * Consulta a API de estoque, atualiza os saldos e gera uma necessidade de compra para
 * cada produto abaixo do mínimo que ainda não tenha necessidade em aberto.
 */
// Fila que impede duas sincronizações ao mesmo tempo (rotina automática + botão), o que geraria alertas duplicados
let fila: Promise<unknown> = Promise.resolve();

export function sincronizarEstoque(origem: "AUTOMATICA" | "MANUAL", usuarioId?: number): Promise<ResultadoSincronizacao> {
  const execucao = fila.then(() => executarSincronizacao(origem, usuarioId));
  fila = execucao.catch(() => undefined);
  return execucao;
}

async function executarSincronizacao(origem: "AUTOMATICA" | "MANUAL", usuarioId?: number): Promise<ResultadoSincronizacao> {
  const inicio = Date.now();
  try {
    const itens = await listarEstoque();
    const produtos = await prisma.produto.findMany({ where: { ativo: true } });
    const porSku = new Map(produtos.map((p) => [p.sku, p]));
    const naoCadastrados: string[] = [];
    let itensAtualizados = 0;
    let alertasGerados = 0;
    const novasNecessidades: string[] = [];

    for (const item of itens) {
      const produto = porSku.get(item.sku);
      if (!produto) {
        naoCadastrados.push(item.sku);
        continue;
      }
      await prisma.produto.update({
        where: { id: produto.id },
        data: { estoqueAtual: item.quantidade, ultimaSincronizacao: new Date() },
      });
      itensAtualizados++;

      if (item.quantidade < produto.estoqueMinimo) {
        const emAberto = await prisma.necessidadeCompra.findFirst({
          where: { produtoId: produto.id, status: { in: ["ABERTA", "EM_COTACAO"] } },
        });
        if (!emAberto) {
          const necessidade = await prisma.necessidadeCompra.create({
            data: {
              produtoId: produto.id,
              quantidade: quantidadeSugerida(item.quantidade, produto.estoqueMinimo, produto.quantidadeReposicao),
              estoqueNoMomento: item.quantidade,
              estoqueMinimo: produto.estoqueMinimo,
              origem: "AUTOMATICA",
            },
          });
          alertasGerados++;
          await registrarLog(usuarioId, "ALERTA_GERADO", "NecessidadeCompra", necessidade.id,
            `${produto.sku} com ${item.quantidade} ${produto.unidade} (mínimo ${produto.estoqueMinimo})`);
          novasNecessidades.push(produto.categoria);
        }
      }
    }

    // Automação de cotações: cada alerta novo já vira cotação enviada aos fornecedores
    let cotacoesEnviadas = 0;
    if (novasNecessidades.length > 0 && (await obterConfiguracaoEnvio()).envioAutomatico) {
      // Uma cotação por categoria com os itens novos
      for (const categoria of new Set(novasNecessidades)) {
        try {
          await abrirCotacao(categoria, null);
          cotacoesEnviadas++;
        } catch (e) {
          console.error("Falha ao abrir cotação automática", e);
        }
      }
    }

    const resultado = { sucesso: true, itensLidos: itens.length, itensAtualizados, alertasGerados, cotacoesEnviadas, naoCadastrados, duracaoMs: Date.now() - inicio };
    await prisma.sincronizacao.create({
      data: { origem, duracaoMs: resultado.duracaoMs, sucesso: true, itensLidos: itens.length, itensAtualizados, alertasGerados },
    });
    await registrarLog(usuarioId, "SINCRONIZACAO", "Estoque", null,
      `${origem}: ${itens.length} itens lidos, ${alertasGerados} alerta(s) gerado(s), ${cotacoesEnviadas} cotação(ões) enviada(s) em ${resultado.duracaoMs} ms`);
    return resultado;
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    const duracaoMs = Date.now() - inicio;
    await prisma.sincronizacao.create({ data: { origem, duracaoMs, sucesso: false, erro } });
    await registrarLog(usuarioId, "SINCRONIZACAO_FALHOU", "Estoque", null, erro);
    return { sucesso: false, itensLidos: 0, itensAtualizados: 0, alertasGerados: 0, cotacoesEnviadas: 0, naoCadastrados: [], duracaoMs, erro };
  }
}
