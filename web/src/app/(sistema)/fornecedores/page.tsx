import Link from "next/link";
import { prisma } from "@/lib/db";
import { Aviso, Cabecalho, Estrelas } from "@/components/ui";
import { formatarCnpj } from "@/lib/formato";

export default async function Fornecedores({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const fornecedores = await prisma.fornecedor.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { propostas: true, } }, propostas: { select: { decisoes: { select: { id: true } } } } },
  });
  return (
    <div>
      <Cabecalho titulo="Fornecedores" descricao="Cadastro e histórico de desempenho dos fornecedores (RF02)">
        <Link href="/fornecedores/novo" className="btn-primario">+ Novo fornecedor</Link>
      </Cabecalho>
      <Aviso searchParams={searchParams} />
      <div className="card overflow-x-auto p-0">
        <table className="tabela">
          <thead><tr><th>Fornecedor</th><th>CNPJ</th><th>Contato</th><th>Histórico</th><th>Propostas</th><th>Vencidas</th><th></th></tr></thead>
          <tbody>
            {fornecedores.map((f) => (
              <tr key={f.id} className={f.ativo ? "" : "opacity-50"}>
                <td className="font-medium">{f.nome}{!f.ativo && " (inativo)"}</td>
                <td className="font-mono text-xs">{formatarCnpj(f.cnpj)}</td>
                <td className="text-xs">{f.contato}<br /><span className="text-slate-500">{f.email}</span></td>
                <td><Estrelas nota={f.notaHistorico} /></td>
                <td>{f._count.propostas}</td>
                <td>{f.propostas.filter((p) => p.decisoes.length > 0).length}</td>
                <td><Link className="link" href={`/fornecedores/${f.id}`}>Editar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
