import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Menu } from "@/components/Menu";
import { sair } from "@/acoes/auth";
import { ROTULO_STATUS } from "@/lib/formato";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();
  const alertas = await prisma.necessidadeCompra.count({ where: { status: "ABERTA" } });
  return (
    <div className="min-h-screen md:flex">
      {/* No celular o menu vira uma gaveta aberta pelo botão ☰ (sem JavaScript: checkbox + peer) */}
      <input id="menu-movel" type="checkbox" className="peer hidden" aria-hidden />
      <header className="nao-imprimir sticky top-0 z-30 flex items-center justify-between bg-marca-900 px-4 py-3 text-white md:hidden">
        <Logo escuro />
        <label htmlFor="menu-movel" className="relative cursor-pointer rounded-lg p-2 text-2xl leading-none hover:bg-white/10" aria-label="Abrir menu">
          ☰
          {alertas > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-xs font-semibold">{alertas}</span>}
        </label>
      </header>
      <label htmlFor="menu-movel" className="nao-imprimir fixed inset-0 z-40 hidden bg-black/40 peer-checked:block md:!hidden" aria-hidden />
      <aside className="nao-imprimir fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 -translate-x-full flex-col overflow-y-auto bg-gradient-to-b from-marca-900 to-marca-700 p-4 text-white transition-transform peer-checked:translate-x-0 md:sticky md:top-0 md:translate-x-0">
        <Logo escuro className="mb-6 px-2" />
        <Menu admin={sessao.perfil === "ADMIN"} alertas={alertas} />
        <div className="mt-auto rounded-lg bg-white/10 p-3 text-sm">
          <p className="font-medium">{sessao.nome}</p>
          <p className="text-xs text-marca-200">{ROTULO_STATUS[sessao.perfil]}</p>
          <form action={sair}>
            <button className="mt-2 text-xs text-marca-100 underline">Sair</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
