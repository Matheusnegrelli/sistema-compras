import Link from "next/link";
import { calcularIndicadores } from "@/lib/indicadores";
import { listarSetores, resumoItens, setorDoFiltro } from "@/lib/consultas";
import { FiltroSetor } from "@/components/FiltroSetor";
import { Cabecalho, Indicador, Vazio } from "@/components/ui";
import { dataHora, duracao, moeda } from "@/lib/formato";
import type { PropostaClassificada } from "@/lib/pontuacao";

export default async function Historico({ searchParams }: { searchParams: Promise<{ setor?: string }> }) {
  const { setor } = await searchParams;
  const ind = await calcularIndicadores(setorDoFiltro(setor));
  return (
    <div>
      <Cabecalho titulo="Histórico e relatórios" descricao="Histórico de cotações e decisões de compra (RF10, RF12)">
        <FiltroSetor setores={await listarSetores()} />
        <a href={`/api/relatorios/decisoes${setor ? `?setor=${setor}` : ""}`} className="btn-secundario">⬇️ Exportar CSV</a>
      </Cabecalho>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Compras aprovadas" valor={ind.totalDecisoes} />
        <Indicador titulo="Valor aprovado" valor={moeda(ind.valorAprovado)} />
        <Indicador titulo="Economia estimada" valor={moeda(ind.economia)} detalhe="vs. proposta mais cara" cor="text-emerald-600" />
        <Indicador titulo="Tempo médio alerta → decisão" valor={ind.totalDecisoes ? duracao(ind.tempoMedioAlertaDecisaoMs) : "-"} />
      </div>
      <div className="card overflow-x-auto p-0">
        {ind.decisoes.length === 0 ? (
          <div className="p-5"><Vazio>Nenhuma decisão registrada ainda.</Vazio></div>
        ) : (
          <table className="tabela">
            <thead><tr><th>Data</th><th>Cotação</th><th>Setores</th><th>Fornecedor</th><th>Propostas</th><th>Pontuação</th><th>Valor</th><th>Recomendação</th><th>Entrega</th><th></th></tr></thead>
            <tbody>
              {ind.decisoes.map((d) => {
                const ranking = d.ranking as unknown as PropostaClassificada[];
                const escolhida = ranking.find((r) => r.id === d.propostaId);
                return (
                  <tr key={d.id}>
                    <td className="text-xs">{dataHora(d.decididoEm)}</td>
                    <td><span className="font-medium">{d.cotacao.categoria}</span><div className="text-xs text-slate-500">{resumoItens(d.cotacao.itens)}</div></td>
                    <td className="text-sm">{[...new Set(d.cotacao.itens.map((i) => i.produto.setor?.sigla ?? "-"))].join(", ")}</td>
                    <td className="font-medium">{d.proposta.fornecedor.nome}</td>
                    <td>{ranking.length}</td>
                    <td>{d.pontuacao.toFixed(1)}</td>
                    <td>{moeda(escolhida?.valorTotal ?? 0)}</td>
                    <td>{d.seguiuRecomendacao ? <span className="text-emerald-700">Seguiu</span> : <span className="text-amber-700" title={d.justificativa ?? ""}>Divergiu</span>}</td>
                    <td className="text-xs">{d.recebidoEm ? `${d.entregueNoPrazo ? "No prazo" : "Atrasada"} · ${d.avaliacao}/5` : "Pendente"}</td>
                    <td className="whitespace-nowrap">
                      <Link className="link" href={`/cotacoes/${d.cotacaoId}`}>Abrir</Link>{" · "}
                      <Link className="link" href={`/cotacoes/${d.cotacaoId}/relatorio`}>Relatório</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
