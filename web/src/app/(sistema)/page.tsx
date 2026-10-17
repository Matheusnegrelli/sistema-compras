import Link from "next/link";
import { prisma } from "@/lib/db";
import { calcularIndicadores } from "@/lib/indicadores";
import { listarSetores, setorDoFiltro } from "@/lib/consultas";
import { FiltroSetor } from "@/components/FiltroSetor";
import { statusApi } from "@/lib/estoque-api";
import { Cabecalho, Criticidade, Indicador, Status, Vazio, Aviso } from "@/components/ui";
import { GraficoEstoque, GraficoFornecedores, GraficoSetores } from "@/components/Graficos";
import { dataHora, duracao, moeda } from "@/lib/formato";
import { sincronizarAgora } from "@/acoes/compras";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ setor?: string; erro?: string; ok?: string }> }) {
  const setorId = setorDoFiltro((await searchParams).setor);
  const doSetor = setorId ? { setorId } : {};
  const [produtos, necessidades, cotacoesAbertas, ind, apiOnline, ultimaSync, setores] = await Promise.all([
    prisma.produto.findMany({ where: { ativo: true, ...doSetor } }),
    prisma.necessidadeCompra.findMany({
      where: { status: { in: ["ABERTA", "EM_COTACAO"] }, produto: doSetor },
      include: { produto: { include: { setor: true } } },
      orderBy: [{ produto: { criticidade: "asc" } }, { criadoEm: "desc" }],
    }),
    prisma.cotacao.count({ where: { status: "ABERTA", ...(setorId ? { itens: { some: { produto: doSetor } } } : {}) } }),
    calcularIndicadores(setorId),
    statusApi(),
    prisma.sincronizacao.findFirst({ orderBy: { iniciadoEm: "desc" } }),
    listarSetores(),
  ]);
  const criticosAbaixo = produtos.filter((p) => p.estoqueAtual < p.estoqueMinimo && p.criticidade === "ALTA").length;
  const porSetor = setorId ? [] : await (async () => {
    const todos = await prisma.produto.findMany({ where: { ativo: true }, select: { setorId: true, estoqueAtual: true, estoqueMinimo: true, criticidade: true } });
    return setores.map((s) => {
      const doS = todos.filter((p) => p.setorId === s.id && p.estoqueAtual < p.estoqueMinimo);
      return {
        sigla: s.sigla,
        abaixo: doS.length,
        criticos: doS.filter((p) => p.criticidade === "ALTA").length,
        necessidades: necessidades.filter((n) => n.produto.setorId === s.id).length,
      };
    });
  })();
  const abaixo = produtos.filter((p) => p.estoqueAtual < p.estoqueMinimo);
  const graficoEstoque = [...produtos]
    .sort((a, b) => a.estoqueAtual / Math.max(1, a.estoqueMinimo) - b.estoqueAtual / Math.max(1, b.estoqueMinimo))
    .slice(0, 10)
    .map((p) => ({ sku: p.sku, atual: p.estoqueAtual, minimo: p.estoqueMinimo }));

  return (
    <div>
      <Cabecalho titulo="Dashboard gerencial" descricao="Visão geral do estoque dos setores do hospital, das necessidades de compra e das decisões tomadas">
        <FiltroSetor setores={setores} />
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${apiOnline ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
          <span className={`h-2 w-2 rounded-full ${apiOnline ? "bg-emerald-500" : "bg-red-500"}`} />
          API de estoque {apiOnline ? "online" : "offline"}
        </span>
        <form action={sincronizarAgora}>
          <input type="hidden" name="volta" value="/" />
          <button className="btn-primario">🔄 Sincronizar estoque</button>
        </form>
      </Cabecalho>
      <Aviso searchParams={searchParams} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Produtos abaixo do mínimo" valor={abaixo.length} detalhe={`${criticosAbaixo} crítico(s) ao paciente · ${produtos.length} monitorados`} cor={abaixo.length ? "text-red-600" : "text-emerald-600"} href={`/produtos?filtro=abaixo${setorId ? `&setor=${setorId}` : ""}`} />
        <Indicador titulo="Necessidades em aberto" valor={necessidades.length} detalhe={`${cotacoesAbertas} cotação(ões) em andamento`} cor="text-amber-600" href={`/necessidades${setorId ? `?setor=${setorId}` : ""}`} />
        <Indicador titulo="Valor aprovado em compras" valor={moeda(ind.valorAprovado)} detalhe={`${ind.totalDecisoes} compra(s) aprovada(s)`} href="/historico" />
        <Indicador titulo="Economia estimada" valor={moeda(ind.economia)} detalhe="vs. proposta mais cara recebida" cor="text-emerald-600" href="/historico" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Tempo médio alerta → decisão" valor={ind.totalDecisoes ? duracao(ind.tempoMedioAlertaDecisaoMs) : "-"} />
        <Indicador titulo="Decisões que seguiram a recomendação" valor={ind.totalDecisoes ? `${Math.round((ind.seguiramRecomendacao / ind.totalDecisoes) * 100)}%` : "-"} />
        <Indicador titulo="Propostas comparadas por cotação" valor={ind.mediaPropostasPorCotacao ? ind.mediaPropostasPorCotacao.toFixed(1) : "-"} />
        <Indicador titulo="Última leitura da API" valor={ultimaSync ? `${ultimaSync.duracaoMs} ms` : "-"} detalhe={ultimaSync ? dataHora(ultimaSync.iniciadoEm) : "nenhuma sincronização"} href="/integracao" />
      </div>

      {porSetor.length > 0 && (
        <div className="card mt-6">
          <h2 className="mb-3">Situação por setor do hospital</h2>
          <GraficoSetores dados={porSetor} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <h2 className="mb-3">Produtos mais próximos do estoque mínimo</h2>
          <GraficoEstoque dados={graficoEstoque} />
        </div>
        <div className="card">
          <h2 className="mb-3">Valor aprovado por fornecedor</h2>
          {ind.porFornecedor.length ? <GraficoFornecedores dados={ind.porFornecedor} /> : <Vazio>Nenhuma compra aprovada ainda.</Vazio>}
        </div>
      </div>

      <div className="card mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2>Alertas de necessidade de compra</h2>
          <Link href="/necessidades" className="link text-sm">Ver todas</Link>
        </div>
        {necessidades.length === 0 ? (
          <Vazio>Nenhum produto abaixo do estoque mínimo. 🎉</Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr><th>Produto</th><th>Setor</th><th>Criticidade</th><th>Estoque</th><th>Mínimo</th><th>Comprar</th><th>Status</th><th>Detectado em</th></tr>
            </thead>
            <tbody>
              {necessidades.slice(0, 8).map((n) => (
                <tr key={n.id}>
                  <td><span className="font-mono text-xs text-slate-500">{n.produto.sku}</span> {n.produto.nome}</td>
                  <td className="text-sm">{n.produto.setor?.sigla ?? "-"}</td>
                  <td><Criticidade valor={n.produto.criticidade} /></td>
                  <td className="font-semibold text-red-600">{n.estoqueNoMomento}</td>
                  <td>{n.estoqueMinimo}</td>
                  <td>{n.quantidade} {n.produto.unidade}</td>
                  <td><Status valor={n.status} /></td>
                  <td>{dataHora(n.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
