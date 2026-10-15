import { NOME_SISTEMA, SUBTITULO_SISTEMA } from "@/lib/marca";

/** Logo do sistema: cruz hospitalar com selo de aprovação (decisão de compra). */
export function IconeLogo({ className = "h-10 w-10", fundo = "#154C47" }: { className?: string; fundo?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={NOME_SISTEMA}>
      <rect width="64" height="64" rx="15" fill={fundo} />
      <path
        d="M25 12h10a2 2 0 0 1 2 2v9h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9v9a2 2 0 0 1-2 2H25a2 2 0 0 1-2-2v-9h-9a2 2 0 0 1-2-2V25a2 2 0 0 1 2-2h9v-9a2 2 0 0 1 2-2z"
        fill="#fff"
      />
      <circle cx="45" cy="45" r="12" fill="#D4A24C" stroke={fundo} strokeWidth="4" />
      <path d="M39.5 45.2l3.8 3.8 7.2-7.6" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ escuro = false, className = "" }: { escuro?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <IconeLogo className="h-10 w-10 shrink-0" fundo={escuro ? "#1F6F66" : "#154C47"} />
      <div className="leading-none">
        <p className={`text-[22px] font-bold tracking-tight ${escuro ? "text-white" : "text-marca-700"}`}>
          {NOME_SISTEMA}<span className="text-[#D4A24C]">.</span>
        </p>
        <p className={`mt-1 text-[9.5px] font-semibold uppercase tracking-[0.2em] ${escuro ? "text-marca-200" : "text-slate-500"}`}>{SUBTITULO_SISTEMA}</p>
      </div>
    </div>
  );
}
