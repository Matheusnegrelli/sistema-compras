"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Seletor de setor que filtra a página atual pelo parâmetro ?setor= */
export function FiltroSetor({ setores }: { setores: { id: number; nome: string }[] }) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  return (
    <select
      className="campo w-auto min-w-[220px]"
      value={params.get("setor") ?? ""}
      onChange={(e) => {
        const p = new URLSearchParams(params.toString());
        p.delete("ok");
        p.delete("erro");
        if (e.target.value) p.set("setor", e.target.value);
        else p.delete("setor");
        router.push(`${caminho}${p.size ? `?${p}` : ""}`);
      }}
    >
      <option value="">🏥 Todos os setores</option>
      {setores.map((s) => (
        <option key={s.id} value={s.id}>{s.nome}</option>
      ))}
    </select>
  );
}
