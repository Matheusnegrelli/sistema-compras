import Link from "next/link";
import { prisma } from "@/lib/db";
import { Aviso, Cabecalho, Status, Vazio } from "@/components/ui";
import { dataHora } from "@/lib/formato";
import { cancelarNecessidade, criarNecessidadeManual, gerarCotacao, sincronizarAgora } from "@/acoes/compras";

export default async function Necessidades({ searchParams }: { searchParams: Promise<{ status?: string; erro?: string; ok?: string }> }) {
  const { status } = await searchParams;
  const filtro = status === "todas" ? {} : { status: { in: ["ABERTA", "EM_COTACAO"] as ("ABERTA" | "EM_COTACAO")[] } };
  const [necessidades, produtos] = await Promise.all([
    prisma.necessidadeCompra.findMany({ where: filtro, include: { produto: true, cotacao: true }, orderBy: { criadoEm: "desc" }, take: 100 }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { sku: "asc" } }),
  ]);

  return (
    <div>
      <Cabecalho titulo="Necessidades de compra" descricao="Alertas gerados automaticamente quando um produto fica abaixo do estoque mínimo (RF05, RF06)">
        <form action={sincronizarAgora}>
          <input type="hidden" name="volta" value="/necessidades" />
          <button className="btn-primario">🔄 Verificar estoque agora</button>
        </form>
      </Cabecalho>
      <Aviso searchParams={searchParams} />

      <div className="mb-4 flex gap-2 text-sm">
        <Link href="/necessidades" className={!status ? "btn-primario" : "btn-secundario"}>Em aberto</Link>
        <Link href="/necessidades?status=todas" className={status === "todas" ? "btn-primario" : "btn-secundario"}>Todas</Link>
      </div>

      <div className="card overflow-x-auto p-0">
        {necessidades.length === 0 ? (
          <div className="p-5"><Vazio>Nenhuma necessidade em aberto. Clique em &quot;Verificar estoque agora&quot; para consultar a API.</Vazio></div>
        ) : (
          <table className="tabela">
            <thead>
              <tr><th>#</th><th>Produto</th><th>Estoque no alerta</th><th>Mínimo</th><th>Qtd. a comprar</th><th>Origem</th><th>Status</th><th>Detectado em</th><th></th></tr>
            </thead>
            <tbody>
              {necessidades.map((n) => (
                <tr key={n.id}>
                  <td className="text-slate-400">{n.id}</td>
                  <td><span className="font-mono text-xs text-slate-500">{n.produto.sku}</span> {n.produto.nome}</td>
                  <td className="font-semibold text-red-600">{n.estoqueNoMomento}</td>
                  <td>{n.estoqueMinimo}</td>
                  <td>{n.quantidade} {n.produto.unidade}</td>
                  <td><Status valor={n.origem} /></td>
                  <td><Status valor={n.status} /></td>
                  <td className="text-xs">{dataHora(n.criadoEm)}</td>
                  <td className="whitespace-nowrap">
                    {n.cotacao ? (
                      <Link className="link" href={`/cotacoes/${n.cotacao.id}`}>Ver cotação</Link>
                    ) : n.status === "ABERTA" ? (
                      <div className="flex gap-2">
                        <form action={gerarCotacao}>
                          <input type="hidden" name="necessidadeId" value={n.id} />
                          <button className="btn-primario px-3 py-1 text-xs">Gerar cotação</button>
                        </form>
                        <form action={cancelarNecessidade}>
                          <input type="hidden" name="id" value={n.id} />
                          <button className="btn-perigo px-3 py-1 text-xs">Cancelar</button>
                        </form>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <details className="card mt-6 max-w-2xl">
        <summary className="cursor-pointer font-medium">Registrar necessidade manualmente</summary>
        <form action={criarNecessidadeManual} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label className="rotulo">Produto</label>
            <select className="campo" name="produtoId" required>
              <option value="">Selecione</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.sku} - {p.nome} (estoque {p.estoqueAtual})</option>)}
            </select>
          </div>
          <div className="w-32">
            <label className="rotulo">Quantidade</label>
            <input className="campo" type="number" min={1} name="quantidade" required />
          </div>
          <button className="btn-secundario">Registrar</button>
        </form>
      </details>
    </div>
  );
}
