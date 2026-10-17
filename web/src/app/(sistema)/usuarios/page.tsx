import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { Aviso, Cabecalho, Status } from "@/components/ui";
import { salvarUsuario } from "@/acoes/cadastros";
import { dataHora } from "@/lib/formato";

const PERFIS = [
  { valor: "COMPRADOR", rotulo: "Comprador", acesso: "Acompanha o estoque, abre cotações, registra propostas, aprova compras, pagamentos e recebimentos." },
  { valor: "GESTOR", rotulo: "Gestor", acesso: "Tudo do comprador, mais os pesos do algoritmo e a automação das cotações." },
  { valor: "ADMIN", rotulo: "Administrador", acesso: "Tudo do gestor, mais o cadastro de usuários e quem pode acessar o sistema." },
];

function SelecaoPerfil({ valor = "COMPRADOR", desabilitado = false }: { valor?: string; desabilitado?: boolean }) {
  return (
    <select className="campo" name="perfil" defaultValue={valor} disabled={desabilitado}>
      {PERFIS.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
    </select>
  );
}

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const sessao = await exigirSessao();
  if (sessao.perfil !== "ADMIN") return <p>Apenas administradores podem acessar esta página.</p>;
  const usuarios = await prisma.usuario.findMany({ orderBy: [{ ativo: "desc" }, { nome: "asc" }] });
  const ativos = usuarios.filter((u) => u.ativo).length;
  return (
    <div>
      <Cabecalho titulo="Usuários e acessos" descricao={`Quem pode entrar no sistema e o que cada um pode fazer · ${ativos} usuário(s) com acesso`} />
      <Aviso searchParams={searchParams} />

      <form action={salvarUsuario} className="card mb-6 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-4">
        <h2 className="md:col-span-4">Novo usuário</h2>
        <div><label className="rotulo">Nome</label><input className="campo" name="nome" required /></div>
        <div><label className="rotulo">E-mail (login)</label><input className="campo" name="email" type="email" required /></div>
        <div><label className="rotulo">Senha inicial</label><input className="campo" name="senha" type="password" minLength={6} required placeholder="mínimo 6 caracteres" /></div>
        <div><label className="rotulo">Perfil</label><SelecaoPerfil /></div>
        <div className="md:col-span-4"><button className="btn-primario">Cadastrar usuário</button></div>
      </form>

      <div className="card mb-6 overflow-x-auto p-0">
        <table className="tabela">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Acesso</th><th>Criado em</th><th></th></tr></thead>
          <tbody>
            {usuarios.map((u) => {
              const voce = u.id === sessao.id;
              return (
                <tr key={u.id} className={u.ativo ? "" : "text-slate-400"}>
                  <td className="font-medium">{u.nome}{voce && <span className="ml-1 text-xs text-slate-500">(você)</span>}</td>
                  <td>{u.email}</td>
                  <td><Status valor={u.perfil} /></td>
                  <td>{u.ativo ? <span className="text-emerald-700">✔ Liberado</span> : <span className="text-red-600">✖ Bloqueado</span>}</td>
                  <td className="text-xs">{dataHora(u.criadoEm)}</td>
                  <td>
                    <details className="group">
                      <summary className="link cursor-pointer list-none text-sm">Editar</summary>
                      <form action={salvarUsuario} className="mt-2 grid w-72 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800">
                        <input type="hidden" name="id" value={u.id} />
                        <div><label className="rotulo">Nome</label><input className="campo" name="nome" defaultValue={u.nome} required /></div>
                        <div><label className="rotulo">E-mail</label><input className="campo" name="email" type="email" defaultValue={u.email} required /></div>
                        <div>
                          <label className="rotulo">Perfil</label>
                          <SelecaoPerfil valor={u.perfil} desabilitado={voce} />
                          {voce && <input type="hidden" name="perfil" value={u.perfil} />}
                        </div>
                        <div><label className="rotulo">Nova senha</label><input className="campo" name="senha" type="password" minLength={6} placeholder="deixe em branco para manter" /></div>
                        {voce ? (
                          <input type="hidden" name="ativo" value="on" />
                        ) : (
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={u.ativo} className="h-4 w-4" /> Acesso liberado</label>
                        )}
                        <button className="btn-primario">Salvar</button>
                      </form>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card max-w-4xl">
        <h2 className="mb-3">O que cada perfil pode fazer</h2>
        <ul className="space-y-2 text-sm">
          {PERFIS.map((p) => (
            <li key={p.valor} className="flex flex-wrap items-start gap-2"><Status valor={p.valor} /><span className="flex-1 text-slate-600">{p.acesso}</span></li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">Um usuário bloqueado não consegue entrar e, se estiver logado, perde o acesso na próxima página que abrir. Os registros dele continuam no histórico e nos logs.</p>
      </div>
    </div>
  );
}
