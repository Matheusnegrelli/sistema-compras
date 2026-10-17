import { obterPesos } from "@/lib/consultas";
import { exigirSessao, podeConfigurar } from "@/lib/auth";
import { Aviso, Cabecalho } from "@/components/ui";
import { salvarEnvio, salvarPesos } from "@/acoes/cadastros";
import { obterConfiguracaoEnvio } from "@/lib/solicitacoes";

const CRITERIOS = [
  { campo: "preco", rotulo: "Preço", explicacao: "Custo dos itens pelo menor preço de cada item ÷ custo pela proposta" },
  { campo: "prazo", rotulo: "Prazo de entrega", explicacao: "Menor prazo da cotação ÷ prazo da proposta" },
  { campo: "disponibilidade", rotulo: "Disponibilidade do produto", explicacao: "Média por item de quantidade disponível ÷ necessária (item não cotado = 0)" },
  { campo: "historico", rotulo: "Histórico do fornecedor", explicacao: "Nota do fornecedor (0 a 5) ÷ 5" },
] as const;

export default async function Configuracoes({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const pesos = await obterPesos();
  const sessao = await exigirSessao();
  const pode = podeConfigurar(sessao.perfil);
  const envio = await obterConfiguracaoEnvio();
  return (
    <div>
      <Cabecalho titulo="Configurações do algoritmo e da automação" descricao="Pontuação ponderada das propostas (seção 4.5 do projeto)" />
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
          mas quem analisa e seleciona a proposta é o comprador. A soma dos pesos deve ser 100%.
        </div>
        {pode ? <button className="btn-primario mt-4">Salvar pesos</button> : <p className="mt-4 text-sm text-slate-500">Somente gestores podem alterar os pesos.</p>}
      </form>

      <form action={salvarEnvio} className="card mt-6 max-w-3xl space-y-4">
        <h2>Automação das cotações</h2>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="envioAutomatico" defaultChecked={envio.envioAutomatico} disabled={!pode} className="mt-1" />
          <span>
            <strong>Enviar cotação automaticamente</strong> quando um item ficar abaixo do estoque mínimo.
            <span className="block text-slate-500">O sistema abre a cotação e envia por e-mail um link exclusivo para cada fornecedor ativo responder.</span>
          </span>
        </label>
        <div className="max-w-xs">
          <label className="rotulo">Prazo para os fornecedores responderem (horas)</label>
          <input className="campo" type="number" name="prazoRespostaHoras" min={1} max={720} defaultValue={envio.prazoRespostaHoras} disabled={!pode} />
        </div>
        {pode && <button className="btn-primario">Salvar automação</button>}
      </form>
    </div>
  );
}
