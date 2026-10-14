import { obterPesos } from "@/lib/consultas";
import { obterSessao, podeAprovar } from "@/lib/auth";
import { Aviso, Cabecalho } from "@/components/ui";
import { salvarPesos } from "@/acoes/cadastros";

const CRITERIOS = [
  { campo: "preco", rotulo: "Preço", explicacao: "Menor preço da cotação ÷ preço da proposta" },
  { campo: "prazo", rotulo: "Prazo de entrega", explicacao: "Menor prazo da cotação ÷ prazo da proposta" },
  { campo: "disponibilidade", rotulo: "Disponibilidade do produto", explicacao: "Quantidade disponível ÷ quantidade necessária (máx. 1)" },
  { campo: "historico", rotulo: "Histórico do fornecedor", explicacao: "Nota do fornecedor (0 a 5) ÷ 5" },
] as const;

export default async function Configuracoes({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const pesos = await obterPesos();
  const sessao = (await obterSessao())!;
  const pode = podeAprovar(sessao.perfil);
  return (
    <div>
      <Cabecalho titulo="Pesos do algoritmo de comparação" descricao="Pontuação ponderada das propostas (seção 4.5 do projeto)" />
      <Aviso searchParams={searchParams} />
      <form action={salvarPesos} className="card max-w-3xl">
        <table className="tabela">
          <thead><tr><th>Critério</th><th>Como a nota (0 a 1) é calculada</th><th className="w-32">Peso (%)</th></tr></thead>
          <tbody>
            {CRITERIOS.map((c) => (
              <tr key={c.campo}>
                <td className="font-medium">{c.rotulo}</td>
                <td className="text-slate-500">{c.explicacao}</td>
                <td><input className="campo" type="number" min={0} max={100} step="1" name={c.campo} defaultValue={pesos[c.campo]} disabled={!pode} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          <strong>Pontuação final</strong> = Σ (nota do critério × peso), de 0 a 100. A proposta com maior pontuação é recomendada,
          mas a compra só é efetivada após aprovação do gestor. A soma dos pesos deve ser 100%.
        </div>
        {pode ? <button className="btn-primario mt-4">Salvar pesos</button> : <p className="mt-4 text-sm text-slate-500">Somente gestores podem alterar os pesos.</p>}
      </form>
    </div>
  );
}
