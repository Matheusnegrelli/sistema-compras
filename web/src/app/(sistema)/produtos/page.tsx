import Link from "next/link";
import { prisma } from "@/lib/db";
import { listarSetores, setorDoFiltro } from "@/lib/consultas";
import { Aviso, Cabecalho, Criticidade, NivelEstoque, Vazio } from "@/components/ui";
import { FiltroSetor } from "@/components/FiltroSetor";
import { dataHora, moeda } from "@/lib/formato";

export default async function Produtos({ searchParams }: { searchParams: Promise<{ q?: string; filtro?: string; setor?: string; erro?: string; ok?: string }> }) {
  const { q, filtro, setor } = await searchParams;
  const setorId = setorDoFiltro(setor);
  let produtos = await prisma.produto.findMany({
    where: {
      ...(setorId ? { setorId } : {}),
      ...(q ? { OR: [{ nome: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { setor: true },
    orderBy: [{ setor: { nome: "asc" } }, { sku: "asc" }],
  });
  if (filtro === "abaixo") produtos = produtos.filter((p) => p.ativo && p.estoqueAtual < p.estoqueMinimo);

  return (
    <div>
      <Cabecalho titulo="Produtos" descricao="Itens hospitalares por setor e configuração do estoque mínimo (RF01, RF03)">
        <FiltroSetor setores={await listarSetores()} />
        <Link href="/produtos/novo" className="btn-primario">+ Novo produto</Link>
      </Cabecalho>
      <Aviso searchParams={searchParams} />
      <form className="mb-4 flex gap-2">
        {setor && <input type="hidden" name="setor" value={setor} />}
        <input className="campo max-w-xs" name="q" defaultValue={q} placeholder="Buscar por nome ou SKU" />
        <select className="campo max-w-[200px]" name="filtro" defaultValue={filtro}>
          <option value="">Todos</option>
          <option value="abaixo">Abaixo do mínimo</option>
        </select>
        <button className="btn-secundario">Filtrar</button>
      </form>
      <div className="card overflow-x-auto p-0">
        {produtos.length === 0 ? (
          <div className="p-5"><Vazio>Nenhum produto encontrado.</Vazio></div>
        ) : (
          <table className="tabela">
            <thead>
              <tr><th>SKU</th><th>Produto</th><th>Setor</th><th>Criticidade</th><th>Estoque atual</th><th>Mínimo</th><th>Preço ref.</th><th>Sincronizado em</th><th></th></tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id} className={p.ativo ? "" : "opacity-50"}>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td>{p.nome}{!p.ativo && " (inativo)"}<div className="text-xs text-slate-500">{p.categoria} · {p.unidade}</div></td>
                  <td className="text-sm">{p.setor?.nome ?? "-"}</td>
                  <td><Criticidade valor={p.criticidade} /></td>
                  <td><NivelEstoque atual={p.estoqueAtual} minimo={p.estoqueMinimo} /></td>
                  <td>{p.estoqueMinimo}</td>
                  <td>{p.precoReferencia ? moeda(p.precoReferencia) : "-"}</td>
                  <td className="text-xs text-slate-500">{dataHora(p.ultimaSincronizacao)}</td>
                  <td><Link className="link" href={`/produtos/${p.id}`}>Editar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
