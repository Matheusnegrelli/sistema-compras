import Link from "next/link";
import { prisma } from "@/lib/db";
import { Aviso, Cabecalho, Status, Vazio } from "@/components/ui";
import { dataHora } from "@/lib/formato";

export default async function Cotacoes({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const cotacoes = await prisma.cotacao.findMany({
    include: { necessidade: { include: { produto: true } }, _count: { select: { propostas: true } }, decisao: { include: { proposta: { include: { fornecedor: true } } } } },
    orderBy: { criadoEm: "desc" },
    take: 100,
  });
  return (
    <div>
      <Cabecalho titulo="Cotações" descricao="Registro, simulação e comparação de propostas de fornecedores (RF07, RF08, RF09)" />
      <Aviso searchParams={searchParams} />
      <div className="card overflow-x-auto p-0">
        {cotacoes.length === 0 ? (
          <div className="p-5"><Vazio>Nenhuma cotação ainda. Gere uma a partir de uma <Link className="link" href="/necessidades">necessidade de compra</Link>.</Vazio></div>
        ) : (
          <table className="tabela">
            <thead><tr><th>#</th><th>Produto</th><th>Quantidade</th><th>Propostas</th><th>Status</th><th>Fornecedor escolhido</th><th>Criada em</th><th></th></tr></thead>
            <tbody>
              {cotacoes.map((c) => (
                <tr key={c.id}>
                  <td className="text-slate-400">{c.id}</td>
                  <td><span className="font-mono text-xs text-slate-500">{c.necessidade.produto.sku}</span> {c.necessidade.produto.nome}</td>
                  <td>{c.necessidade.quantidade} {c.necessidade.produto.unidade}</td>
                  <td>{c._count.propostas}</td>
                  <td><Status valor={c.status} /></td>
                  <td>{c.decisao?.proposta.fornecedor.nome ?? "-"}</td>
                  <td className="text-xs">{dataHora(c.criadoEm)}</td>
                  <td><Link className="link" href={`/cotacoes/${c.id}`}>Abrir</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
