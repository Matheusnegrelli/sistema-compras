import { calcularIndicadores } from "@/lib/indicadores";
import { setorDoFiltro } from "@/lib/consultas";
import { obterSessao } from "@/lib/auth";
import type { PropostaClassificada } from "@/lib/pontuacao";

export const dynamic = "force-dynamic";

function csv(v: unknown) {
  const s = String(v ?? "");
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Exporta o histórico de decisões em CSV (abre no Excel). */
export async function GET(req: Request) {
  if (!(await obterSessao())) return new Response("Não autorizado", { status: 401 });
  const { decisoes } = await calcularIndicadores(setorDoFiltro(new URL(req.url).searchParams.get("setor") ?? undefined));
  const linhas = [
    ["cotacao", "data_alerta", "data_decisao", "categoria", "setores", "itens", "itens_comprados", "fornecedor", "prazo_dias", "valor_total", "pontuacao", "propostas_comparadas", "seguiu_recomendacao", "justificativa", "responsavel_id", "entregue_no_prazo", "avaliacao"],
  ];
  for (const d of decisoes) {
    const ranking = d.ranking as unknown as PropostaClassificada[];
    const e = ranking.find((r) => r.id === d.propostaId);
    linhas.push([
      d.cotacaoId, (d.cotacao.itens[0]?.criadoEm ?? d.cotacao.criadoEm).toISOString(), d.decididoEm.toISOString(), d.cotacao.categoria,
      [...new Set(d.cotacao.itens.map((i) => i.produto.setor?.nome ?? "-"))].join(", "),
      d.cotacao.itens.map((i) => `${i.produto.nome} (${i.quantidade} ${i.produto.unidade})`).join(", "),
      e?.itensAtendidos ?? "", d.proposta.fornecedor.nome, e?.prazoEntregaDias, e?.valorTotal, d.pontuacao,
      ranking.length, d.seguiuRecomendacao ? "sim" : "nao", d.justificativa, d.gestorId,
      d.entregueNoPrazo == null ? "" : d.entregueNoPrazo ? "sim" : "nao", d.avaliacao,
    ].map((v) => (v == null ? "" : String(v))));
  }
  const corpo = "﻿" + linhas.map((l) => l.map(csv).join(";")).join("\n");
  return new Response(corpo, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="historico-decisoes.csv"' },
  });
}
