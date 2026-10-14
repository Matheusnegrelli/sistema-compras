import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { carregarCotacao } from "@/lib/consultas";
import { obterSessao, podeAprovar } from "@/lib/auth";
import { Aviso, Cabecalho, Estrelas, Status, Vazio } from "@/components/ui";
import { GraficoPontuacao } from "@/components/Graficos";
import { dataHora, dias, moeda } from "@/lib/formato";
import type { PropostaClassificada } from "@/lib/pontuacao";
import {
  adicionarProposta, aprovarProposta, cancelarCotacao, registrarRecebimento, removerProposta, simularPropostasCotacao,
} from "@/acoes/compras";

export default async function Cotacao({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { id } = await params;
  const dados = await carregarCotacao(Number(id));
  if (!dados) notFound();
  const { cotacao, pesos } = dados;
  const sessao = (await obterSessao())!;
  const aberta = cotacao.status === "ABERTA";
  // Após a decisão, mostra o ranking registrado no momento da aprovação (rastreabilidade)
  const ranking = cotacao.decisao ? (cotacao.decisao.ranking as unknown as PropostaClassificada[]) : dados.ranking;
  const pesosExibidos = cotacao.decisao ? (cotacao.decisao.pesos as typeof pesos) : pesos;
  const { necessidade } = cotacao;
  const fornecedores = aberta ? await prisma.fornecedor.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }) : [];
  const melhor = ranking[0];

  return (
    <div>
      <Cabecalho
        titulo={`Cotação #${cotacao.id} · ${necessidade.produto.nome}`}
        descricao={`${necessidade.quantidade} ${necessidade.produto.unidade} · estoque no alerta ${necessidade.estoqueNoMomento} (mínimo ${necessidade.estoqueMinimo}) · aberta por ${cotacao.criadoPor?.nome ?? "-"} em ${dataHora(cotacao.criadoEm)}`}
      >
        <Status valor={cotacao.status} />
        {ranking.length > 0 && <Link href={`/cotacoes/${cotacao.id}/relatorio`} className="btn-secundario">🖨️ Relatório de apoio à decisão</Link>}
      </Cabecalho>
      <Aviso searchParams={searchParams} />

      {aberta && (
        <div className="card mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2>Solicitar propostas</h2>
              <p className="text-sm text-slate-500">Registre as propostas recebidas ou simule o retorno dos fornecedores cadastrados.</p>
            </div>
            <div className="flex gap-2">
              <form action={simularPropostasCotacao}>
                <input type="hidden" name="cotacaoId" value={cotacao.id} />
                <button className="btn-primario">⚡ Simular propostas dos fornecedores</button>
              </form>
              <form action={cancelarCotacao}>
                <input type="hidden" name="cotacaoId" value={cotacao.id} />
                <button className="btn-perigo">Cancelar cotação</button>
              </form>
            </div>
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-marca-600">+ Registrar proposta manualmente</summary>
            <form action={adicionarProposta} className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-6">
              <input type="hidden" name="cotacaoId" value={cotacao.id} />
              <div className="col-span-2">
                <label className="rotulo">Fornecedor</label>
                <select className="campo" name="fornecedorId" required>
                  <option value="">Selecione</option>
                  {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div><label className="rotulo">Preço unit. (R$)</label><input className="campo" name="precoUnitario" type="number" step="0.01" min="0.01" required /></div>
              <div><label className="rotulo">Prazo (dias)</label><input className="campo" name="prazoEntregaDias" type="number" min={0} required /></div>
              <div><label className="rotulo">Qtd. disponível</label><input className="campo" name="quantidadeDisponivel" type="number" min={0} required defaultValue={necessidade.quantidade} /></div>
              <div><label className="rotulo">Qtd. mínima</label><input className="campo" name="quantidadeMinima" type="number" min={1} defaultValue={1} /></div>
              <div className="col-span-2 md:col-span-5"><label className="rotulo">Observação</label><input className="campo" name="observacao" /></div>
              <div className="flex items-end"><button className="btn-secundario w-full">Salvar proposta</button></div>
            </form>
          </details>
        </div>
      )}

      <div className="card mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2>Comparativo das propostas</h2>
          <p className="text-xs text-slate-500">
            Pesos: preço {pesosExibidos.preco}% · prazo {pesosExibidos.prazo}% · disponibilidade {pesosExibidos.disponibilidade}% · histórico {pesosExibidos.historico}%
          </p>
        </div>
        {ranking.length === 0 ? (
          <Vazio>Nenhuma proposta registrada ainda.</Vazio>
        ) : (
          <>
            {aberta && melhor && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <strong>Recomendação do sistema:</strong> {melhor.fornecedor} com {melhor.pontuacao.toFixed(1)} pontos
                ({moeda(melhor.precoUnitario)}/un, {dias(melhor.prazoEntregaDias)}, total {moeda(melhor.valorTotal)}).
                A decisão final é do gestor.
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr><th>#</th><th>Fornecedor</th><th>Preço unit.</th><th>Prazo</th><th>Disponível</th><th>Qtd. mín.</th><th>Histórico</th><th>Valor total</th><th>Pontuação</th><th>Alertas</th><th></th></tr>
                </thead>
                <tbody>
                  {ranking.map((r) => {
                    const escolhida = cotacao.decisao?.propostaId === r.id;
                    return (
                      <tr key={r.id} className={escolhida ? "bg-emerald-50" : ""}>
                        <td className="font-semibold">{r.posicao}º</td>
                        <td className="font-medium">{r.fornecedor}{escolhida && " ✅"}</td>
                        <td>{moeda(r.precoUnitario)}</td>
                        <td className="whitespace-nowrap">{dias(r.prazoEntregaDias)}</td>
                        <td>{r.quantidadeDisponivel}</td>
                        <td>{r.quantidadeMinima}</td>
                        <td><Estrelas nota={r.notaHistorico} /></td>
                        <td>{moeda(r.valorTotal)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                              <div className="h-full bg-marca-500" style={{ width: `${r.pontuacao}%` }} />
                            </div>
                            <span className="font-semibold">{r.pontuacao.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="text-xs text-amber-700">{r.alertas.join("; ")}</td>
                        <td>
                          {aberta && (
                            <form action={removerProposta}>
                              <input type="hidden" name="id" value={r.id} />
                              <button className="text-xs text-red-600 hover:underline" title="Remover proposta">remover</button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-700">Composição da pontuação por critério</h3>
            <GraficoPontuacao dados={ranking.map((r) => ({ fornecedor: r.fornecedor, ...r.contribuicao }))} />
          </>
        )}
      </div>

      {aberta && ranking.length > 0 && (
        <div className="card mb-6">
          <h2 className="mb-1">Decisão do gestor</h2>
          {podeAprovar(sessao.perfil) ? (
            <form action={aprovarProposta} className="mt-3 space-y-3">
              <input type="hidden" name="cotacaoId" value={cotacao.id} />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="rotulo">Proposta escolhida</label>
                  <select className="campo" name="propostaId" defaultValue={melhor.id}>
                    {ranking.map((r) => <option key={r.id} value={r.id}>{r.posicao}º · {r.fornecedor} · {r.pontuacao.toFixed(1)} pts · {moeda(r.valorTotal)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="rotulo">Justificativa (obrigatória se não for a recomendada)</label>
                  <input className="campo" name="justificativa" />
                </div>
              </div>
              <button className="btn-sucesso">✔ Aprovar compra</button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">Aguardando aprovação de um usuário com perfil Gestor.</p>
          )}
        </div>
      )}

      {cotacao.decisao && (
        <div className="card mb-6 border-emerald-200">
          <h2 className="mb-2">Decisão registrada</h2>
          <p className="text-sm">
            <strong>{cotacao.decisao.gestor.nome}</strong> aprovou a proposta de <strong>{cotacao.decisao.proposta.fornecedor.nome}</strong> em {dataHora(cotacao.decisao.decididoEm)}
            {" "}({cotacao.decisao.pontuacao.toFixed(1)} pts, {cotacao.decisao.seguiuRecomendacao ? "seguindo a recomendação do sistema" : "diferente da recomendação"}).
          </p>
          {cotacao.decisao.justificativa && <p className="mt-1 text-sm text-slate-600">Justificativa: {cotacao.decisao.justificativa}</p>}
          {cotacao.decisao.recebidoEm ? (
            <p className="mt-3 text-sm text-emerald-700">
              Recebido em {dataHora(cotacao.decisao.recebidoEm)} · {cotacao.decisao.entregueNoPrazo ? "no prazo" : "com atraso"} · avaliação {cotacao.decisao.avaliacao}/5
            </p>
          ) : (
            <form action={registrarRecebimento} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
              <input type="hidden" name="cotacaoId" value={cotacao.id} />
              <div>
                <label className="rotulo">Entregue no prazo?</label>
                <select className="campo" name="entregueNoPrazo"><option value="sim">Sim</option><option value="nao">Não</option></select>
              </div>
              <div>
                <label className="rotulo">Avaliação da entrega</label>
                <select className="campo" name="avaliacao" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}</select>
              </div>
              <button className="btn-secundario">📦 Registrar recebimento</button>
              <p className="w-full text-xs text-slate-500">Atualiza a nota de histórico do fornecedor e dá entrada do material na API de estoque.</p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
