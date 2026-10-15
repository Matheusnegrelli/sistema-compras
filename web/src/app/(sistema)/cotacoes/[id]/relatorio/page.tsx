import { notFound } from "next/navigation";
import { carregarCotacao } from "@/lib/consultas";
import { dataHora, dias, moeda, ROTULO_STATUS } from "@/lib/formato";
import type { PropostaClassificada } from "@/lib/pontuacao";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Logo } from "@/components/Logo";

export default async function Relatorio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dados = await carregarCotacao(Number(id));
  if (!dados) notFound();
  const { cotacao } = dados;
  const ranking = cotacao.decisao ? (cotacao.decisao.ranking as unknown as PropostaClassificada[]) : dados.ranking;
  const pesos = cotacao.decisao ? (cotacao.decisao.pesos as typeof dados.pesos) : dados.pesos;
  const n = cotacao.necessidade;
  const melhor = ranking[0];
  const maisBarata = [...ranking].sort((a, b) => a.precoUnitario - b.precoUnitario)[0];

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 shadow-sm print:p-0 print:shadow-none">
      <div className="nao-imprimir mb-6 flex justify-end"><BotaoImprimir /></div>
      <div className="border-b border-slate-200 pb-4">
        <div className="mb-3 flex items-center justify-between"><Logo /><p className="text-xs uppercase tracking-wide text-slate-500">Relatório de apoio à decisão</p></div>
        <h1 className="mt-1">Cotação #{cotacao.id}: {n.produto.nome}</h1>
        <p className="text-sm text-slate-500">Emitido em {dataHora(new Date())}</p>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-slate-500">Produto</p><p className="font-medium">{n.produto.sku} · {n.produto.nome}</p></div>
        <div><p className="text-slate-500">Setor solicitante</p><p className="font-medium">{n.produto.setor?.nome ?? "-"}</p></div>
        <div><p className="text-slate-500">Criticidade / categoria</p><p className="font-medium">{ROTULO_STATUS[n.produto.criticidade]} · {n.produto.categoria}</p></div>
        <div><p className="text-slate-500">Quantidade necessária</p><p className="font-medium">{n.quantidade} {n.produto.unidade}</p></div>
        <div><p className="text-slate-500">Estoque no alerta / mínimo</p><p className="font-medium">{n.estoqueNoMomento} / {n.estoqueMinimo}</p></div>
        <div><p className="text-slate-500">Alerta gerado em</p><p className="font-medium">{dataHora(n.criadoEm)} ({n.origem === "AUTOMATICA" ? "automático via API" : "manual"})</p></div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2">Critérios e pesos</h2>
        <p className="text-sm text-slate-600">
          Pontuação ponderada (0 a 100): preço {pesos.preco}%, prazo de entrega {pesos.prazo}%, disponibilidade {pesos.disponibilidade}% e histórico do
          fornecedor {pesos.historico}%. Cada critério é normalizado pela melhor proposta da cotação.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2">Classificação das propostas</h2>
        <table className="tabela">
          <thead><tr><th>#</th><th>Fornecedor</th><th>Preço</th><th>Prazo</th><th>Disp.</th><th>Hist.</th><th>Total</th><th>Preço</th><th>Prazo</th><th>Disp.</th><th>Hist.</th><th>Pontos</th></tr></thead>
          <tbody>
            {ranking.map((r) => (
              <tr key={r.id}>
                <td>{r.posicao}º</td>
                <td className="font-medium">{r.fornecedor}</td>
                <td>{moeda(r.precoUnitario)}</td>
                <td>{r.prazoEntregaDias}d</td>
                <td>{r.quantidadeDisponivel}</td>
                <td>{r.notaHistorico.toFixed(1)}</td>
                <td>{moeda(r.valorTotal)}</td>
                <td className="text-slate-500">{r.contribuicao.preco.toFixed(1)}</td>
                <td className="text-slate-500">{r.contribuicao.prazo.toFixed(1)}</td>
                <td className="text-slate-500">{r.contribuicao.disponibilidade.toFixed(1)}</td>
                <td className="text-slate-500">{r.contribuicao.historico.toFixed(1)}</td>
                <td className="font-semibold">{r.pontuacao.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {melhor && (
        <section className="mt-6 rounded-lg border border-slate-200 p-4 text-sm">
          <h2 className="mb-2">Análise</h2>
          <p>
            A proposta mais vantajosa segundo os critérios definidos é a de <strong>{melhor.fornecedor}</strong>, com {melhor.pontuacao.toFixed(1)} pontos,
            valor total de {moeda(melhor.valorTotal)} e entrega em {dias(melhor.prazoEntregaDias)}.
            {maisBarata && maisBarata.id !== melhor.id && (
              <> A proposta de menor preço ({maisBarata.fornecedor}, {moeda(maisBarata.precoUnitario)}/un) ficou em {maisBarata.posicao}º lugar
              {" "}por apresentar desvantagens em outros critérios ({dias(maisBarata.prazoEntregaDias)} de prazo, histórico {maisBarata.notaHistorico.toFixed(1)}).</>
            )}
          </p>
          {melhor.alertas.length > 0 && <p className="mt-2 text-amber-700">Atenção: {melhor.alertas.join("; ")}.</p>}
        </section>
      )}

      <section className="mt-6 text-sm">
        <h2 className="mb-2">Decisão</h2>
        {cotacao.decisao ? (
          <p>
            Selecionada por <strong>{cotacao.decisao.gestor.nome}</strong> em {dataHora(cotacao.decisao.decididoEm)}: proposta de{" "}
            <strong>{cotacao.decisao.proposta.fornecedor.nome}</strong> ({cotacao.decisao.seguiuRecomendacao ? "seguiu a recomendação" : "diferente da recomendação"}).
            {cotacao.decisao.justificativa && <> Justificativa: {cotacao.decisao.justificativa}.</>}
          </p>
        ) : (
          <p className="text-slate-500">Aguardando seleção do comprador. Assinatura: ______________________________</p>
        )}
      </section>
      <p className="mt-8 text-xs text-slate-400">O sistema apenas indica a proposta mais adequada com base nos dados disponíveis; a escolha final é do comprador.</p>
    </div>
  );
}
