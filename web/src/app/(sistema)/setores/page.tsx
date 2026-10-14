import Link from "next/link";
import { prisma } from "@/lib/db";
import { Aviso, Cabecalho } from "@/components/ui";
import { salvarSetor } from "@/acoes/cadastros";

export default async function Setores({ searchParams }: { searchParams: Promise<{ editar?: string; erro?: string; ok?: string }> }) {
  const { editar } = await searchParams;
  const [setores, necessidades] = await Promise.all([
    prisma.setor.findMany({ orderBy: { nome: "asc" }, include: { produtos: { where: { ativo: true }, select: { estoqueAtual: true, estoqueMinimo: true, criticidade: true } } } }),
    prisma.necessidadeCompra.findMany({ where: { status: { in: ["ABERTA", "EM_COTACAO"] } }, select: { produto: { select: { setorId: true } } } }),
  ]);
  const emEdicao = setores.find((s) => s.id === Number(editar));

  return (
    <div>
      <Cabecalho titulo="Setores do hospital" descricao="Cada produto pertence a um setor; alertas, cotações e relatórios podem ser filtrados por setor" />
      <Aviso searchParams={searchParams} />
      <div className="card mb-6 overflow-x-auto p-0">
        <table className="tabela">
          <thead>
            <tr><th>Sigla</th><th>Setor</th><th>Responsável</th><th>Produtos</th><th>Abaixo do mínimo</th><th>Críticos abaixo</th><th>Necessidades abertas</th><th></th></tr>
          </thead>
          <tbody>
            {setores.map((s) => {
              const abaixo = s.produtos.filter((p) => p.estoqueAtual < p.estoqueMinimo);
              const criticos = abaixo.filter((p) => p.criticidade === "ALTA").length;
              const abertas = necessidades.filter((n) => n.produto.setorId === s.id).length;
              return (
                <tr key={s.id} className={s.ativo ? "" : "opacity-50"}>
                  <td className="font-mono text-xs">{s.sigla}</td>
                  <td className="font-medium">{s.nome}{!s.ativo && " (inativo)"}</td>
                  <td className="text-slate-600">{s.responsavel ?? "-"}</td>
                  <td>{s.produtos.length}</td>
                  <td className={abaixo.length ? "font-semibold text-red-600" : ""}>{abaixo.length}</td>
                  <td className={criticos ? "font-semibold text-red-600" : ""}>{criticos}</td>
                  <td>{abertas ? <Link className="link" href={`/necessidades?setor=${s.id}`}>{abertas}</Link> : 0}</td>
                  <td className="whitespace-nowrap">
                    <Link className="link" href={`/produtos?setor=${s.id}`}>Produtos</Link>{" · "}
                    <Link className="link" href={`/setores?editar=${s.id}`}>Editar</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form action={salvarSetor} key={emEdicao?.id ?? "novo"} className="card grid max-w-3xl grid-cols-1 gap-3 md:grid-cols-4">
        <h2 className="md:col-span-4">{emEdicao ? `Editar ${emEdicao.nome}` : "Novo setor"}</h2>
        {emEdicao && <input type="hidden" name="id" value={emEdicao.id} />}
        <div><label className="rotulo">Sigla</label><input className="campo font-mono" name="sigla" required defaultValue={emEdicao?.sigla} placeholder="UTI" /></div>
        <div className="md:col-span-2"><label className="rotulo">Nome do setor</label><input className="campo" name="nome" required defaultValue={emEdicao?.nome} /></div>
        <div><label className="rotulo">Responsável</label><input className="campo" name="responsavel" defaultValue={emEdicao?.responsavel ?? ""} /></div>
        {emEdicao && (
          <label className="flex items-center gap-2 text-sm md:col-span-4">
            <input type="checkbox" name="ativo" defaultChecked={emEdicao.ativo} /> Ativo
          </label>
        )}
        <div className="flex gap-2 md:col-span-4">
          <button className="btn-primario">Salvar</button>
          {emEdicao && <Link href="/setores" className="btn-secundario">Cancelar</Link>}
        </div>
      </form>
    </div>
  );
}
