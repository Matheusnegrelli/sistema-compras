"use client";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const detalhe = error.message.includes("permissão") || process.env.NODE_ENV === "development" ? error.message : null;
  return (
    <div className="card max-w-xl">
      <h2 className="mb-2">Não foi possível concluir a operação</h2>
      <p className="text-sm text-slate-600">{detalhe ?? "Ocorreu um erro inesperado. Tente novamente."}</p>
      {error.digest && <p className="mt-2 text-xs text-slate-400">Código do erro: {error.digest} (detalhes no terminal do sistema)</p>}
      <button className="btn-secundario mt-4" onClick={reset}>Tentar novamente</button>
    </div>
  );
}
