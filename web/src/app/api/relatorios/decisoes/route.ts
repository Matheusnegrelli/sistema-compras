import { calcularIndicadores } from "@/lib/indicadores";
import { obterSessao } from "@/lib/auth";
import type { PropostaClassificada } from "@/lib/pontuacao";

export const dynamic = "force-dynamic";

function csv(v: unknown) {
  const s = String(v ?? "");
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Exporta o histórico de decisões em CSV (abre no Excel). */
export async function GET() {
  if (!(await obterSessao())) return new Response("Não autorizado", { status: 401 });
  const { decisoes } = await calcularIndicadores();
  const linhas = [
    ["cotacao", "data_alerta", "data_decisao", "produto", "quantidade", "fornecedor", "preco_unitario", "prazo_dias", "valor_total", "pontuacao", "propostas_comparadas", "seguiu_recomendacao", "justificativa", "gestor_id", "entregue_no_prazo", "avaliacao"],
  ];
  for (const d of decisoes) {
    const ranking = d.ranking as unknown as PropostaClassificada[];
    const e = ranking.find((r) => r.id === d.propostaId);
    linhas.push([
      d.cotacaoId, d.cotacao.necessidade.criadoEm.toISOString(), d.decididoEm.toISOString(), d.cotacao.necessidade.produto.nome,
      d.cotacao.necessidade.quantidade, d.proposta.fornecedor.nome, e?.precoUnitario, e?.prazoEntregaDias, e?.valorTotal, d.pontuacao,
      ranking.length, d.seguiuRecomendacao ? "sim" : "nao", d.justificativa, d.gestorId,
      d.entregueNoPrazo == null ? "" : d.entregueNoPrazo ? "sim" : "nao", d.avaliacao,
    ].map(String));
  }
  const corpo = "﻿" + linhas.map((l) => l.map(csv).join(";")).join("\n");
  return new Response(corpo, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="historico-decisoes.csv"' },
  });
}
