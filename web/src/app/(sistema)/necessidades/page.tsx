import Link from "next/link";
import { prisma } from "@/lib/db";
import { Aviso, Cabecalho, Criticidade, Status, Vazio } from "@/components/ui";
import { FiltroSetor } from "@/components/FiltroSetor";
import { listarSetores, setorDoFiltro } from "@/lib/consultas";
import { dataHora } from "@/lib/formato";
import { cancelarNecessidade, criarNecessidadeManual, gerarCotacao, sincronizarAgora } from "@/acoes/compras";

export default async function Necessidades({ searchParams }: { searchParams: Promise<{ status?: string; setor?: string; erro?: string; ok?: string }> }) {
  const { status, setor } = await searchParams;
  const setorId = setorDoFiltro(setor);
  const filtro = {
    ...(status === "todas" ? {} : { status: { in: ["ABERTA", "EM_COTACAO"] as ("ABERTA" | "EM_COTACAO")[] } }),
    ...(setorId ? { produto: { setorId } } : {}),
  };
  const [necessidades, produtos] = await Promise.all([
    prisma.necessidadeCompra.findMany({
      where: filtro,
      include: { produto: { include: { setor: true } }, cotacao: true },
      // Itens críticos ao paciente aparecem primeiro
      orderBy: [{ produto: { criticidade: "asc" } }, { criadoEm: "desc" }],
      take: 100,
    }),
    prisma.produto.findMany({ where: { ativo: true, ...(setorId ? { setorId } : {}) }, include: { setor: true }, orderBy: { sku: "asc" } }),
  ]);

  return (
    <div>
      <Cabecalho titulo="Necessidades de compra" descricao="Alertas gerados automaticamente quando um item de qualquer setor fica abaixo do estoque mínimo (RF05, RF06)">
        <FiltroSetor setores={await listarSetores()} />
        <form action={sincronizarAgora}>
          <input type="hidden" name="volta" value="/necessidades" />
          <button className="btn-primario">🔄 Verificar estoque agora</button>
        </form>
      </Cabecalho>
      <Aviso searchParams={searchParams} />

      <div className="mb-4 flex gap-2 text-sm">
        <Link href={`/necessidades${setor ? `?setor=${setor}` : ""}`} className={!status ? "btn-primario" : "btn-secundario"}>Em aberto</Link>
        <Link href={`/necessidades?status=todas${setor ? `&setor=${setor}` : ""}`} className={status === "todas" ? "btn-primario" : "btn-secundario"}>Todas</Link>
      </div>

      <div className="card overflow-x-auto p-0">
        {necessidades.length === 0 ? (
          <div className="p-5"><Vazio>Nenhuma necessidade em aberto. Clique em &quot;Verificar estoque agora&quot; para consultar a API.</Vazio></div>
        ) : (
          <table className="tabela">
            <thead>
              <tr><th>Produto</th><th>Setor</th><th>Criticidade</th><th>Estoque</th><th>Mínimo</th><th>Comprar</th><th>Status</th><th>Detectado</th><th></th></tr>
            </thead>
            <tbody>
              {necessidades.map((n) => (
                <tr key={n.id}>
                  <td className="min-w-[220px]"><span className="font-mono text-xs text-slate-500">{n.produto.sku}</span> {n.produto.nome}</td>
                  <td className="text-sm">{n.produto.setor?.sigla ?? "-"}</td>
                  <td><Criticidade valor={n.produto.criticidade} /></td>
                  <td className="font-semibold text-red-600">{n.estoqueNoMomento}</td>
                  <td>{n.estoqueMinimo}</td>
                  <td className="whitespace-nowrap">{n.quantidade} {n.produto.unidade}</td>
                  <td><Status valor={n.status} /></td>
                  <td className="text-xs">{dataHora(n.criadoEm)}<div className="text-slate-400">{n.origem === "AUTOMATICA" ? "via API" : "manual"}</div></td>
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
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.sku} - {p.nome} · {p.setor?.sigla} (estoque {p.estoqueAtual})</option>)}
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
