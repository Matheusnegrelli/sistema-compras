import { prisma } from "@/lib/db";
import { listarEstoque, statusApi, type ItemEstoque } from "@/lib/estoque-api";
import { Aviso, Cabecalho, Status } from "@/components/ui";
import { dataHora } from "@/lib/formato";
import { simularConsumoEstoque, sincronizarAgora } from "@/acoes/compras";

export default async function Integracao({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const online = await statusApi();
  let itens: ItemEstoque[] = [];
  let erro = "";
  try {
    itens = online ? await listarEstoque() : [];
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }
  const [sincronizacoes, produtos] = await Promise.all([
    prisma.sincronizacao.findMany({ orderBy: { iniciadoEm: "desc" }, take: 15 }),
    prisma.produto.findMany({ select: { sku: true, estoqueMinimo: true } }),
  ]);
  const minimos = new Map(produtos.map((p) => [p.sku, p.estoqueMinimo]));
  const intervalo = Number(process.env.SYNC_INTERVALO_MIN || "5");

  return (
    <div>
      <Cabecalho titulo="Integração com o estoque (API)" descricao="Consulta automática ao sistema de estoque por API REST (RF04, RNF06)">
        <form action={simularConsumoEstoque}><button className="btn-secundario">📉 Simular consumo no estoque</button></form>
        <form action={sincronizarAgora}>
          <input type="hidden" name="volta" value="/integracao" />
          <button className="btn-primario">🔄 Sincronizar agora</button>
        </form>
      </Cabecalho>
      <Aviso searchParams={searchParams} />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Status da API</p>
          <p className={`mt-2 text-2xl font-semibold ${online ? "text-emerald-600" : "text-red-600"}`}>{online ? "Online" : "Offline"}</p>
          <p className="mt-1 break-all font-mono text-xs text-slate-500">{process.env.ESTOQUE_API_URL}/api/v1/estoque</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Rotina automática</p>
          <p className="mt-2 text-2xl font-semibold">{intervalo > 0 ? `A cada ${intervalo} min` : "Desativada"}</p>
          <p className="mt-1 text-xs text-slate-500">Também pode ser executada manualmente.</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Autenticação</p>
          <p className="mt-2 text-2xl font-semibold">Chave de API</p>
          <p className="mt-1 text-xs text-slate-500">Cabeçalho <code>x-api-key</code> enviado em cada requisição.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card overflow-x-auto">
          <h2 className="mb-3">Dados recebidos da API agora</h2>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <table className="tabela">
            <thead><tr><th>SKU</th><th>Descrição</th><th>Saldo</th><th>Mínimo</th><th>Atualizado</th></tr></thead>
            <tbody>
              {itens.map((i) => {
                const min = minimos.get(i.sku);
                return (
                  <tr key={i.sku}>
                    <td className="font-mono text-xs">{i.sku}</td>
                    <td>{i.descricao}</td>
                    <td className={min != null && i.quantidade < min ? "font-semibold text-red-600" : ""}>{i.quantidade} {i.unidade}</td>
                    <td>{min ?? <span className="text-xs text-slate-400">não cadastrado</span>}</td>
                    <td className="text-xs">{dataHora(i.atualizadoEm)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card overflow-x-auto">
          <h2 className="mb-3">Últimas sincronizações</h2>
          <table className="tabela">
            <thead><tr><th>Data</th><th>Origem</th><th>Resultado</th><th>Itens</th><th>Alertas</th><th>Duração</th></tr></thead>
            <tbody>
              {sincronizacoes.map((s) => (
                <tr key={s.id}>
                  <td className="text-xs">{dataHora(s.iniciadoEm)}</td>
                  <td><Status valor={s.origem} /></td>
                  <td>{s.sucesso ? <span className="text-emerald-700">Sucesso</span> : <span className="text-red-600" title={s.erro ?? ""}>Falha</span>}</td>
                  <td>{s.itensLidos}</td>
                  <td>{s.alertasGerados}</td>
                  <td>{s.duracaoMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
