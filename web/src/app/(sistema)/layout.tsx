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
    <div className="flex min-h-screen">
      <aside className="nao-imprimir sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-marca-900 to-marca-700 p-4 text-white">
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
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
