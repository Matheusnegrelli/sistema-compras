import { entrar } from "@/acoes/auth";
import { Aviso } from "@/components/ui";

export default function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-marca-900 to-marca-600 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <p className="text-2xl font-bold text-marca-700">CompraCerta</p>
        <p className="mb-6 text-sm text-slate-500">Sistema web de apoio à decisão na gestão de compras</p>
        <Aviso searchParams={searchParams} />
        <form action={entrar} className="space-y-4">
          <div>
            <label className="rotulo" htmlFor="email">E-mail</label>
            <input className="campo" id="email" name="email" type="email" required defaultValue="gestor@compracerta.com" />
          </div>
          <div>
            <label className="rotulo" htmlFor="senha">Senha</label>
            <input className="campo" id="senha" name="senha" type="password" required defaultValue="123456" />
          </div>
          <button className="btn-primario w-full">Entrar</button>
        </form>
        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-600">Usuários de demonstração (senha 123456)</p>
          <p>admin@compracerta.com · gestor@compracerta.com · comprador@compracerta.com</p>
        </div>
      </div>
    </div>
  );
}
