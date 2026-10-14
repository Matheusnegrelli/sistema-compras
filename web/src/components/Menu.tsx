"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", rotulo: "Dashboard", icone: "📊" },
  { href: "/necessidades", rotulo: "Necessidades de compra", icone: "🚨" },
  { href: "/cotacoes", rotulo: "Cotações", icone: "📝" },
  { href: "/historico", rotulo: "Histórico e relatórios", icone: "📚" },
  { href: "/produtos", rotulo: "Produtos", icone: "📦" },
  { href: "/fornecedores", rotulo: "Fornecedores", icone: "🏭" },
  { href: "/integracao", rotulo: "Integração (API)", icone: "🔌" },
  { href: "/configuracoes", rotulo: "Pesos do algoritmo", icone: "⚖️" },
  { href: "/usuarios", rotulo: "Usuários", icone: "👥", admin: true },
  { href: "/logs", rotulo: "Logs", icone: "🧾" },
];

export function Menu({ admin, alertas }: { admin: boolean; alertas: number }) {
  const caminho = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {ITENS.filter((i) => !i.admin || admin).map((i) => {
        const ativo = i.href === "/" ? caminho === "/" : caminho.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${ativo ? "bg-white/15 font-medium text-white" : "text-blue-100 hover:bg-white/10"}`}
          >
            <span aria-hidden>{i.icone}</span>
            <span className="flex-1">{i.rotulo}</span>
            {i.href === "/necessidades" && alertas > 0 && (
              <span className="rounded-full bg-red-500 px-2 text-xs font-semibold text-white">{alertas}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
