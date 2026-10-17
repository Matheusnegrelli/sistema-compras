import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { carregarCotacao } from "@/lib/consultas";
import { exigirSessao } from "@/lib/auth";
import { Aviso, Cabecalho, Criticidade, Estrelas, Status, Vazio } from "@/components/ui";
import { GraficoPontuacao } from "@/components/Graficos";
import { dataHora, dias, moeda } from "@/lib/formato";

const ROTULO_ORIGEM: Record<string, string> = { FORNECEDOR: "via link", SIMULADA: "simulada", MANUAL: "lançada", AUTOMATICA: "" };
import type { PropostaClassificada } from "@/lib/pontuacao";
import {
  adicionarProposta, aprovarProposta, cancelarCotacao, registrarRecebimento, reenviarCotacao, removerProposta, simularPropostasCotacao,
} from "@/acoes/compras";

export default async function Cotacao({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { id } = await params;
  const dados = await carregarCotacao(Number(id));
  if (!dados) notFound();
  const { cotacao, pesos } = dados;
  await exigirSessao();
  const aberta = cotacao.status === "ABERTA";
  // Após a decisão, mostra o ranking registrado no momento da aprovação (rastreabilidade)
  const ranking = cotacao.decisao ? (cotacao.decisao.ranking as unknown as PropostaClassificada[]) : dados.ranking;
  const pesosExibidos = cotacao.decisao ? (cotacao.decisao.pesos as typeof pesos) : pesos;
  const { itens } = cotacao;
  const setoresDaCotacao = [...new Set(itens.map((i) => i.produto.setor?.sigla ?? "-"))].join(", ");
  const temCritico = itens.some((i) => i.produto.criticidade === "ALTA");
  const fornecedores = aberta ? await prisma.fornecedor.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }) : [];
  const melhor = ranking[0];
  const origens = new Map(cotacao.propostas.map((p) => [p.id, ROTULO_ORIGEM[p.origem]]));
  const respondidas = cotacao.solicitacoes.filter((s) => s.respondidoEm).length;

  return (
    <div>
      <Cabecalho
        titulo={`Cotação #${cotacao.id} · ${cotacao.categoria}`}
        descricao={`${itens.length} ${itens.length === 1 ? "item" : "itens"} · setores ${setoresDaCotacao} · aberta por ${cotacao.criadoPor?.nome ?? "rotina automática"} em ${dataHora(cotacao.criadoEm)}`}
      >
        {temCritico && <Criticidade valor="ALTA" />}
        <Status valor={cotacao.status} />
        {ranking.length > 0 && <Link href={`/cotacoes/${cotacao.id}/relatorio`} className="btn-secundario">🖨️ Relatório de apoio à decisão</Link>}
      </Cabecalho>
      <Aviso searchParams={searchParams} />

      <div className="card mb-6 overflow-x-auto">
        <h2 className="mb-3">Itens da cotação</h2>
        <table className="tabela">
          <thead><tr><th>Produto</th><th>Setor</th><th>Criticidade</th><th>Estoque no alerta</th><th>Mínimo</th><th>Comprar</th></tr></thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id}>
                <td><span className="font-mono text-xs text-slate-500">{i.produto.sku}</span> {i.produto.nome}</td>
                <td className="text-sm">{i.produto.setor?.nome ?? "-"}</td>
                <td><Criticidade valor={i.produto.criticidade} /></td>
                <td className="font-semibold text-red-600">{i.estoqueNoMomento}</td>
                <td>{i.estoqueMinimo}</td>
                <td className="whitespace-nowrap font-medium">{i.quantidade} {i.produto.unidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(aberta || cotacao.solicitacoes.length > 0) && (
        <div className="card mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2>Pedido de cotação aos fornecedores</h2>
              <p className="text-sm text-slate-500">
                {cotacao.solicitacoes.length > 0
                  ? <>Enviado por e-mail a {cotacao.solicitacoes.length} fornecedor(es) · {respondidas} responderam · prazo de resposta {dataHora(cotacao.prazoResposta)}</>
                  : "Nenhum pedido enviado ainda."}
              </p>
            </div>
            {aberta && (
              <div className="flex flex-wrap gap-2">
                <form action={reenviarCotacao}>
                  <input type="hidden" name="cotacaoId" value={cotacao.id} />
                  <button className="btn-secundario">✉️ Enviar a novos fornecedores</button>
                </form>
                <form action={simularPropostasCotacao}>
                  <input type="hidden" name="cotacaoId" value={cotacao.id} />
                  <button className="btn-primario">⚡ Simular propostas dos fornecedores</button>
                </form>
                <form action={cancelarCotacao}>
                  <input type="hidden" name="cotacaoId" value={cotacao.id} />
                  <button className="btn-perigo">Cancelar cotação</button>
                </form>
              </div>
            )}
          </div>
          {cotacao.solicitacoes.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="tabela">
                <thead><tr><th>Fornecedor</th><th>E-mail</th><th>Enviado</th><th>Abriu o link</th><th>Respondeu</th><th></th></tr></thead>
                <tbody>
                  {cotacao.solicitacoes.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium">{s.fornecedor.nome}</td>
                      <td className="text-xs">{s.fornecedor.email}</td>
                      <td className="text-xs">{dataHora(s.enviadoEm)}</td>
                      <td className="text-xs">{s.visualizadoEm ? dataHora(s.visualizadoEm) : "-"}</td>
                      <td>{s.respondidoEm ? <span className="text-xs font-medium text-emerald-700">✔ {dataHora(s.respondidoEm)}</span> : <span className="text-xs text-amber-700">Aguardando</span>}</td>
                      <td><a className="link text-xs" href={`/responder/${s.token}`} target="_blank" rel="noreferrer" title="Abre a página que o fornecedor recebe por e-mail">abrir como fornecedor ↗</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {aberta && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-marca-700">+ Registrar proposta recebida por telefone ou WhatsApp</summary>
              <form action={adicionarProposta} className="mt-3 space-y-3">
                <input type="hidden" name="cotacaoId" value={cotacao.id} />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <label className="rotulo">Fornecedor</label>
                    <select className="campo" name="fornecedorId" required>
                      <option value="">Selecione</option>
                      {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </div>
                  <div><label className="rotulo">Prazo de entrega (dias)</label><input className="campo" name="prazoEntregaDias" type="number" min={0} required /></div>
                  <div><label className="rotulo">Observação</label><input className="campo" name="observacao" /></div>
                </div>
                <table className="tabela">
                  <thead><tr><th>Item</th><th>Preço unit. (R$)</th><th>Qtd. disponível</th><th>Qtd. mínima</th></tr></thead>
                  <tbody>
                    {itens.map((i) => (
                      <tr key={i.id}>
                        <td className="text-sm">{i.produto.nome} <span className="text-slate-400">({i.quantidade} {i.produto.unidade})</span></td>
                        <td><input className="campo" name={`preco_${i.id}`} type="number" step="0.01" min="0.01" placeholder="não cotou" /></td>
                        <td><input className="campo" name={`disp_${i.id}`} type="number" min={0} defaultValue={i.quantidade} /></td>
                        <td><input className="campo" name={`min_${i.id}`} type="number" min={1} defaultValue={1} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="btn-secundario">Salvar proposta</button>
              </form>
            </details>
          )}
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
                ({melhor.itensAtendidos} de {itens.length} {itens.length === 1 ? "item" : "itens"}, entrega em {dias(melhor.prazoEntregaDias)}, total {moeda(melhor.valorTotal)}).
                A escolha final é do comprador.
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr><th>#</th><th>Fornecedor</th><th>Itens cotados</th><th>Prazo</th><th>Histórico</th><th>Valor total</th><th>Pontuação</th><th>Alertas</th><th></th></tr>
                </thead>
                <tbody>
                  {ranking.map((r) => {
                    const escolhida = cotacao.decisao?.propostaId === r.id;
                    return (
                      <tr key={r.id} className={escolhida ? "bg-emerald-50" : ""}>
                        <td className="font-semibold">{r.posicao}º</td>
                        <td className="font-medium">{r.fornecedor}{escolhida && " ✅"}{origens.get(r.id) && <span className="ml-1 text-[10px] font-normal text-slate-400">{origens.get(r.id)}</span>}</td>
                        <td>{r.itensAtendidos} de {itens.length}</td>
                        <td className="whitespace-nowrap">{dias(r.prazoEntregaDias)}</td>
                        <td><Estrelas nota={r.notaHistorico} /></td>
                        <td>{moeda(r.valorTotal)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                              <div className="h-full bg-marca-700" style={{ width: `${r.pontuacao}%` }} />
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
            <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-700">Preço unitário por item (menor preço em verde)</h3>
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead><tr><th>Item</th>{ranking.map((r) => <th key={r.id}>{r.posicao}º {r.fornecedor}</th>)}</tr></thead>
                <tbody>
                  {itens.map((i) => {
                    const precos = ranking.map((r) => r.itensCalculados.find((x) => x.necessidadeId === i.id));
                    const menor = Math.min(...precos.filter(Boolean).map((x) => x!.precoUnitario));
                    return (
                      <tr key={i.id}>
                        <td className="text-sm">{i.produto.nome} <span className="text-slate-400">({i.quantidade} {i.produto.unidade})</span></td>
                        {precos.map((x, k) => (
                          <td key={k} className={x && x.precoUnitario === menor ? "font-semibold text-emerald-700" : ""}>
                            {x ? <>{moeda(x.precoUnitario)}{x.quantidadeDisponivel < i.quantidade && <span className="block text-[10px] text-amber-700">só {x.quantidadeDisponivel}</span>}</> : <span className="text-slate-400">não cotou</span>}
                          </td>
                        ))}
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
          <h2 className="mb-1">Seleção da proposta pelo comprador</h2>
          <p className="text-sm text-slate-500">Analise o comparativo e selecione a proposta. Você pode escolher outra que não a recomendada, informando o motivo.</p>
          
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
              <button className="btn-sucesso">✔ Selecionar proposta e aprovar compra</button>
            </form>
        </div>
      )}

      {cotacao.decisao && (
        <div className="card mb-6 border-emerald-200">
          <h2 className="mb-2">Decisão registrada</h2>
          <p className="text-sm">
            <strong>{cotacao.decisao.gestor.nome}</strong> selecionou a proposta de <strong>{cotacao.decisao.proposta.fornecedor.nome}</strong> em {dataHora(cotacao.decisao.decididoEm)}
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
