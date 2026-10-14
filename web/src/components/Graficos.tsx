"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PALETA = ["#2563eb", "#0d9488", "#d97706", "#7c3aed", "#db2777", "#475569"];

export function GraficoEstoque({ dados }: { dados: { sku: string; atual: number; minimo: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={dados} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="sku" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar isAnimationActive={false} dataKey="atual" name="Estoque atual" fill="#2563eb" radius={[4, 4, 0, 0]}>
          {dados.map((d) => (
            <Cell key={d.sku} fill={d.atual < d.minimo ? "#dc2626" : "#2563eb"} />
          ))}
        </Bar>
        <Bar isAnimationActive={false} dataKey="minimo" name="Estoque mínimo" fill="#94a3b8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficoFornecedores({ dados }: { dados: { nome: string; valor: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie isAnimationActive={false} data={dados} dataKey="valor" nameKey="nome" innerRadius={60} outerRadius={100} paddingAngle={2}>
          {dados.map((d, i) => (
            <Cell key={d.nome} fill={PALETA[i % PALETA.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function GraficoPontuacao({ dados }: { dados: { fornecedor: string; preco: number; prazo: number; disponibilidade: number; historico: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, dados.length * 48)}>
      <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="fornecedor" width={150} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => `${v.toFixed(1)} pts`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar isAnimationActive={false} dataKey="preco" name="Preço" stackId="a" fill={PALETA[0]} />
        <Bar isAnimationActive={false} dataKey="prazo" name="Prazo" stackId="a" fill={PALETA[1]} />
        <Bar isAnimationActive={false} dataKey="disponibilidade" name="Disponibilidade" stackId="a" fill={PALETA[2]} />
        <Bar isAnimationActive={false} dataKey="historico" name="Histórico" stackId="a" fill={PALETA[3]} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
