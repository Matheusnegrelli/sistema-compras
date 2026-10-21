"use client";
import { useFormStatus } from "react-dom";

/** Botão de formulário que mostra "aguarde" enquanto a ação roda (a API de estoque pode levar até um minuto para acordar). */
export function BotaoEnviar({ children, aguarde, className = "btn-primario" }: { children: React.ReactNode; aguarde: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={`${className} disabled:cursor-wait disabled:opacity-70`} disabled={pending} aria-busy={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {aguarde}
        </span>
      ) : children}
    </button>
  );
}
