import { entrar } from "@/acoes/auth";
import { Aviso } from "@/components/ui";
import { Logo } from "@/components/Logo";

export default function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-marca-900 to-marca-700 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <Logo className="mb-4" />
        <p className="mb-6 text-sm text-slate-500">Apoio à decisão na gestão de compras hospitalares</p>
        <Aviso searchParams={searchParams} />
        <form action={entrar} className="space-y-4">
          <div>
            <label className="rotulo" htmlFor="email">E-mail</label>
            <input className="campo" id="email" name="email" type="email" required defaultValue="comprador@provisa.com" />
          </div>
          <div>
            <label className="rotulo" htmlFor="senha">Senha</label>
            <input className="campo" id="senha" name="senha" type="password" required defaultValue="123456" />
          </div>
          <button className="btn-primario w-full">Entrar</button>
        </form>
        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-600">Usuários de demonstração (senha 123456)</p>
          <p>admin@provisa.com · gestor@provisa.com · comprador@provisa.com</p>
        </div>
      </div>
    </div>
  );
}
