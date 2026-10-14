import Link from "next/link";
import { ROTULO_STATUS } from "@/lib/formato";

export function Cabecalho({ titulo, descricao, children }: { titulo: string; descricao?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1>{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
      </div>
      {children && <div className="nao-imprimir flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export async function Aviso({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { erro, ok } = await searchParams;
  if (!erro && !ok) return null;
  return (
    <div className={`nao-imprimir mb-5 rounded-lg border px-4 py-3 text-sm ${erro ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      {erro ?? ok}
    </div>
  );
}

const CORES: Record<string, string> = {
  ABERTA: "bg-amber-100 text-amber-800",
  EM_COTACAO: "bg-blue-100 text-blue-800",
  ATENDIDA: "bg-emerald-100 text-emerald-800",
  APROVADA: "bg-emerald-100 text-emerald-800",
  CANCELADA: "bg-slate-200 text-slate-600",
  AUTOMATICA: "bg-violet-100 text-violet-800",
  MANUAL: "bg-slate-100 text-slate-700",
  SIMULADA: "bg-cyan-100 text-cyan-800",
  ADMIN: "bg-rose-100 text-rose-800",
  GESTOR: "bg-indigo-100 text-indigo-800",
  COMPRADOR: "bg-teal-100 text-teal-800",
};

export function Status({ valor }: { valor: string }) {
  return (
    <span className={`inline-flex h-fit whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${CORES[valor] ?? "bg-slate-100 text-slate-700"}`}>
      {ROTULO_STATUS[valor] ?? valor}
    </span>
  );
}

export function Indicador({ titulo, valor, detalhe, cor = "text-slate-900", href }: { titulo: string; valor: React.ReactNode; detalhe?: string; cor?: string; href?: string }) {
  const corpo = (
    <div className="card h-full">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className={`mt-2 text-3xl font-semibold ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-slate-500">{detalhe}</p>}
    </div>
  );
  return href ? <Link href={href} className="block transition hover:-translate-y-0.5">{corpo}</Link> : corpo;
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{children}</div>;
}

export function NivelEstoque({ atual, minimo }: { atual: number; minimo: number }) {
  const abaixo = atual < minimo;
  const pct = minimo > 0 ? Math.min(100, (atual / (minimo * 2)) * 100) : 100;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${abaixo ? "bg-red-500" : atual < minimo * 1.3 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={abaixo ? "font-semibold text-red-600" : ""}>{atual}</span>
    </div>
  );
}

export function Estrelas({ nota }: { nota: number }) {
  return (
    <span title={`${nota.toFixed(2)} de 5`} className="whitespace-nowrap">
      <span className="text-amber-500">{"★".repeat(Math.round(nota))}</span>
      <span className="text-slate-300">{"★".repeat(5 - Math.round(nota))}</span>
      <span className="ml-1 text-xs text-slate-500">{nota.toFixed(1)}</span>
    </span>
  );
}
