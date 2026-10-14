import { prisma } from "@/lib/db";
import { Cabecalho } from "@/components/ui";
import { dataHora } from "@/lib/formato";

export default async function Logs({ searchParams }: { searchParams: Promise<{ acao?: string }> }) {
  const { acao } = await searchParams;
  const [logs, acoes] = await Promise.all([
    prisma.log.findMany({ where: acao ? { acao } : {}, include: { usuario: true }, orderBy: { criadoEm: "desc" }, take: 200 }),
    prisma.log.findMany({ distinct: ["acao"], select: { acao: true }, orderBy: { acao: "asc" } }),
  ]);
  return (
    <div>
      <Cabecalho titulo="Logs de operações" descricao="Registro das operações principais para auditoria e rastreabilidade (RNF03)" />
      <form className="mb-4 flex gap-2">
        <select className="campo max-w-xs" name="acao" defaultValue={acao}>
          <option value="">Todas as ações</option>
          {acoes.map((a) => <option key={a.acao}>{a.acao}</option>)}
        </select>
        <button className="btn-secundario">Filtrar</button>
      </form>
      <div className="card overflow-x-auto p-0">
        <table className="tabela">
          <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Detalhes</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-xs">{dataHora(l.criadoEm)}</td>
                <td>{l.usuario?.nome ?? <span className="text-slate-400">Sistema</span>}</td>
                <td className="font-mono text-xs">{l.acao}</td>
                <td className="text-xs">{l.entidade}{l.entidadeId ? ` #${l.entidadeId}` : ""}</td>
                <td className="text-xs text-slate-600">{l.detalhes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
