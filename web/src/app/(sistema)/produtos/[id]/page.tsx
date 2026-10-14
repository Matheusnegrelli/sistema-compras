import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Aviso, Cabecalho, Status } from "@/components/ui";
import { FormProduto } from "@/components/FormProduto";
import { dataHora } from "@/lib/formato";

export default async function EditarProduto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const produto = await prisma.produto.findUnique({
    where: { id: Number(id) },
    include: { necessidades: { orderBy: { criadoEm: "desc" }, take: 10 } },
  });
  if (!produto) notFound();
  return (
    <div>
      <Cabecalho titulo={`Editar ${produto.sku}`} descricao={`Estoque atual na API: ${produto.estoqueAtual} ${produto.unidade}`} />
      <Aviso searchParams={searchParams} />
      <FormProduto produto={produto} />
      <div className="card mt-6 max-w-2xl">
        <h2 className="mb-3">Histórico de necessidades deste produto</h2>
        {produto.necessidades.length === 0 ? <p className="text-sm text-slate-500">Nenhuma.</p> : (
          <table className="tabela">
            <thead><tr><th>Data</th><th>Estoque</th><th>Quantidade</th><th>Origem</th><th>Status</th></tr></thead>
            <tbody>
              {produto.necessidades.map((n) => (
                <tr key={n.id}><td>{dataHora(n.criadoEm)}</td><td>{n.estoqueNoMomento}</td><td>{n.quantidade}</td><td><Status valor={n.origem} /></td><td><Status valor={n.status} /></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
