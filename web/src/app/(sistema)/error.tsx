"use client";

export default function Erro({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card max-w-xl">
      <h2 className="mb-2">Não foi possível concluir a operação</h2>
      <p className="text-sm text-slate-600">{error.message.includes("permissão") ? error.message : "Ocorreu um erro inesperado. Tente novamente."}</p>
      <button className="btn-secundario mt-4" onClick={reset}>Tentar novamente</button>
    </div>
  );
}
