import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { Aviso, Cabecalho, Status } from "@/components/ui";
import { salvarUsuario } from "@/acoes/cadastros";
import { dataHora } from "@/lib/formato";

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const sessao = await exigirSessao();
  if (sessao.perfil !== "ADMIN") return <p>Apenas administradores podem acessar esta página.</p>;
  const usuarios = await prisma.usuario.findMany({ orderBy: { nome: "asc" } });
  return (
    <div>
      <Cabecalho titulo="Usuários" descricao="Cadastro de usuários e perfis de acesso" />
      <Aviso searchParams={searchParams} />
      <div className="card mb-6 overflow-x-auto p-0">
        <table className="tabela">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Ativo</th><th>Criado em</th></tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td><td>{u.email}</td><td><Status valor={u.perfil} /></td><td>{u.ativo ? "Sim" : "Não"}</td><td className="text-xs">{dataHora(u.criadoEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={salvarUsuario} className="card grid max-w-3xl grid-cols-1 gap-3 md:grid-cols-4">
        <h2 className="md:col-span-4">Novo usuário</h2>
        <div><label className="rotulo">Nome</label><input className="campo" name="nome" required /></div>
        <div><label className="rotulo">E-mail</label><input className="campo" name="email" type="email" required /></div>
        <div><label className="rotulo">Senha</label><input className="campo" name="senha" type="password" minLength={6} required /></div>
        <div>
          <label className="rotulo">Perfil</label>
          <select className="campo" name="perfil"><option value="COMPRADOR">Comprador</option><option value="GESTOR">Gestor</option><option value="ADMIN">Administrador</option></select>
        </div>
        <div><button className="btn-primario">Cadastrar</button></div>
      </form>
    </div>
  );
}
