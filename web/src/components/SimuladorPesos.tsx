"use client";

import { useMemo, useState } from "react";
import { classificarPropostas, type ItemNecessario, type Pesos, type PropostaEntrada } from "@/lib/pontuacao";

const CRITERIOS: { chave: keyof Pesos; rotulo: string }[] = [
  { chave: "preco", rotulo: "Preço" },
  { chave: "prazo", rotulo: "Prazo de entrega" },
  { chave: "disponibilidade", rotulo: "Disponibilidade" },
  { chave: "historico", rotulo: "Histórico do fornecedor" },
];

const CENARIOS: { nome: string; pesos: Pesos }[] = [
  { nome: "Prioridade: preço", pesos: { preco: 70, prazo: 10, disponibilidade: 10, historico: 10 } },
  { nome: "Urgência (prazo)", pesos: { preco: 15, prazo: 60, disponibilidade: 15, historico: 10 } },
  { nome: "Item crítico (disponibilidade)", pesos: { preco: 15, prazo: 25, disponibilidade: 50, historico: 10 } },
  { nome: "Confiabilidade", pesos: { preco: 20, prazo: 20, disponibilidade: 20, historico: 40 } },
];

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Análise de sensibilidade: o comprador altera os pesos dos critérios e vê como o ranking muda.
 * Usa o mesmo algoritmo do servidor e não altera a configuração do sistema.
 */
export function SimuladorPesos({ entradas, necessarios, pesosAtuais }: { entradas: PropostaEntrada[]; necessarios: ItemNecessario[]; pesosAtuais: Pesos }) {
  const [pesos, setPesos] = useState<Pesos>(pesosAtuais);
  const atual = useMemo(() => classificarPropostas(entradas, necessarios, pesosAtuais), [entradas, necessarios, pesosAtuais]);
  const simulado = useMemo(() => classificarPropostas(entradas, necessarios, pesos), [entradas, necessarios, pesos]);
  const soma = pesos.preco + pesos.prazo + pesos.disponibilidade + pesos.historico || 1;
  const posicaoAtual = new Map(atual.map((r) => [r.id, r.posicao]));
  const mudouLider = simulado[0]?.id !== atual[0]?.id;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {CENARIOS.map((c) => (
          <button key={c.nome} type="button" className="btn-secundario px-3 py-1 text-xs" onClick={() => setPesos(c.pesos)}>{c.nome}</button>
        ))}
        <button type="button" className="btn-secundario px-3 py-1 text-xs" onClick={() => setPesos(pesosAtuais)}>↺ Pesos configurados</button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          {CRITERIOS.map(({ chave, rotulo }) => (
            <div key={chave}>
              <div className="mb-1 flex justify-between text-sm">
                <label htmlFor={`peso-${chave}`} className="font-medium text-slate-700">{rotulo}</label>
                <span className="tabular-nums text-slate-600">{Math.round((pesos[chave] / soma) * 100)}%</span>
              </div>
              <input
                id={`peso-${chave}`} type="range" min={0} max={100} step={5} value={pesos[chave]}
                onChange={(e) => setPesos({ ...pesos, [chave]: Number(e.target.value) })}
                className="w-full accent-marca-700"
              />
            </div>
          ))}
          <p className="text-xs text-slate-500">Os pesos são normalizados para somar 100%. A simulação não altera a configuração do sistema.</p>
        </div>
        <div className="overflow-x-auto">
          <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${mudouLider ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>
            {mudouLider
              ? <>Com estes pesos a melhor proposta passa a ser <strong>{simulado[0].fornecedor}</strong> (antes: {atual[0].fornecedor}).</>
              : <>A recomendação se mantém: <strong>{simulado[0]?.fornecedor}</strong> continua em 1º lugar.</>}
          </div>
          <table className="tabela">
            <thead><tr><th>#</th><th>Fornecedor</th><th>Pontuação</th><th>Valor total</th><th>Variação</th></tr></thead>
            <tbody>
              {simulado.map((r) => {
                const antes = posicaoAtual.get(r.id) ?? r.posicao;
                const delta = antes - r.posicao;
                return (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.posicao}º</td>
                    <td>{r.fornecedor}</td>
                    <td className="tabular-nums">{r.pontuacao.toFixed(1)}</td>
                    <td className="tabular-nums">{moeda(r.valorTotal)}</td>
                    <td className={`text-xs font-medium ${delta > 0 ? "text-emerald-700" : delta < 0 ? "text-red-600" : "text-slate-400"}`}>
                      {delta > 0 ? `▲ subiu ${delta}` : delta < 0 ? `▼ caiu ${-delta}` : "sem mudança"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
