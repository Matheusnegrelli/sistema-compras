import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Cabecalho } from "@/components/ui";
import { calcularAvaliacao, ETAPAS_MANUAIS, ETAPAS_SISTEMA, REFERENCIA_MANUAL_HORAS, type ReferenciaManual } from "@/lib/avaliacao";
import { duracao } from "@/lib/formato";

const HORA = 3_600_000;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "-");

function Barra({ rotulo, manual, sistema }: { rotulo: string; manual: number; sistema: number }) {
  const max = Math.max(manual, sistema, 1);
  const reducao = manual > 0 ? Math.max(0, Math.round((1 - sistema / manual) * 100)) : 0;
  return (
    <div className="py-2">
      <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{rotulo}</span><span className="text-emerald-700">−{reducao}%</span></div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2"><span className="w-20 text-slate-500">Manual</span><div className="h-3 rounded bg-slate-400" style={{ width: `${(manual / max) * 70}%` }} /><span>{duracao(manual)}</span></div>
        <div className="flex items-center gap-2"><span className="w-20 text-slate-500">Sistema</span><div className="h-3 rounded bg-marca-700" style={{ width: `${Math.max(0.5, (sistema / max) * 70)}%` }} /><span>{duracao(sistema)}</span></div>
      </div>
    </div>
  );
}

function Hipotese({ codigo, titulo, conclusao, children }: { codigo: string; titulo: string; conclusao: string; children: React.ReactNode }) {
  return (
    <section className="card break-inside-avoid">
      <p className="text-xs font-semibold uppercase tracking-wide text-marca-700">{codigo}</p>
      <h2 className="mb-3">{titulo}</h2>
      {children}
      <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900"><strong>Resultado:</strong> {conclusao}</p>
    </section>
  );
}

export default async function Avaliacao({ searchParams }: { searchParams: Promise<Partial<Record<keyof ReferenciaManual, string>>> }) {
  const sp = await searchParams;
  const ref = Object.fromEntries(
    Object.entries(REFERENCIA_MANUAL_HORAS).map(([k, v]) => {
      const n = Number(sp[k as keyof ReferenciaManual]);
      return [k, Number.isFinite(n) && n >= 0 && sp[k as keyof ReferenciaManual] ? n : v];
    }),
  ) as ReferenciaManual;
  const a = await calcularAvaliacao();
  const t = a.tempos;
  const manualTotal = (ref.identificacao + ref.preparo + ref.comparacao + ref.pedido) * HORA;
  const sistemaTotal = t.identificacaoMs + t.preparoMs + t.comparacaoMs;

  return (
    <div>
      <Cabecalho titulo="Avaliação da proposta" descricao="Comparação entre o processo manual e o automatizado, organizada pelas hipóteses H1 a H4 do projeto">
        <BotaoImprimir />
      </Cabecalho>

      <form className="card nao-imprimir mb-6">
        <h2 className="mb-1">Tempos de referência do processo manual (horas)</h2>
        <p className="mb-3 text-sm text-slate-500">Estimativas iniciais. Substitua pelos tempos levantados com o setor de compras do hospital e clique em Recalcular.</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div><label className="rotulo">Identificar itens</label><input className="campo" name="identificacao" type="number" step="0.5" min={0} defaultValue={ref.identificacao} /></div>
          <div><label className="rotulo">Montar e enviar cotação</label><input className="campo" name="preparo" type="number" step="0.5" min={0} defaultValue={ref.preparo} /></div>
          <div><label className="rotulo">Comparar propostas</label><input className="campo" name="comparacao" type="number" step="0.5" min={0} defaultValue={ref.comparacao} /></div>
          <div><label className="rotulo">Pedido e avisos</label><input className="campo" name="pedido" type="number" step="0.5" min={0} defaultValue={ref.pedido} /></div>
          <div className="flex items-end"><button className="btn-primario w-full">Recalcular</button></div>
        </div>
      </form>

      <p className="mb-4 text-sm text-slate-500">Base: {a.totalDecisoes} cotações decididas, {a.propostas.total} propostas, {a.sincronizacoes.total} leituras da API de estoque.</p>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Hipotese codigo="H1" titulo="Redução do tempo de busca, organização e comparação"
          conclusao={`o trabalho do comprador nessas etapas cai de ${duracao(manualTotal)} para ${duracao(sistemaTotal)} por cotação (−${manualTotal ? Math.max(0, Math.round((1 - sistemaTotal / manualTotal) * 100)) : 0}%). O tempo de espera pela resposta dos fornecedores (${duracao(t.respostaMs)} em média) não depende do comprador.`}>
          <Barra rotulo="Identificar itens abaixo do mínimo" manual={ref.identificacao * HORA} sistema={t.identificacaoMs} />
          <Barra rotulo="Montar e enviar a cotação" manual={ref.preparo * HORA} sistema={t.preparoMs} />
          <Barra rotulo="Comparar as propostas" manual={ref.comparacao * HORA} sistema={t.comparacaoMs} />
          <Barra rotulo="Emitir pedido e avisar fornecedores" manual={ref.pedido * HORA} sistema={0} />
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="mb-1 font-medium">Processo manual: {ETAPAS_MANUAIS.length} etapas</p>
              <ol className="list-decimal pl-5 text-xs text-slate-600">{ETAPAS_MANUAIS.map((e) => <li key={e}>{e}</li>)}</ol>
            </div>
            <div>
              <p className="mb-1 font-medium">Com o sistema: {ETAPAS_SISTEMA.length} ações do comprador</p>
              <ol className="list-decimal pl-5 text-xs text-slate-600">{ETAPAS_SISTEMA.map((e) => <li key={e}>{e}</li>)}</ol>
              <p className="mt-2 text-xs text-slate-500">O restante (leitura do estoque, alertas, envio da cotação, ranking, pedido, avisos e entrada no estoque) é automático.</p>
            </div>
          </div>
        </Hipotese>

        <Hipotese codigo="H2" titulo="Menos erros de digitação e de comunicação"
          conclusao={`${pct(a.propostas.total - a.propostas.digitadasComprador, a.propostas.total)} das propostas chegaram sem digitação do comprador, o estoque é lido pela API em vez de conferido à mão e as ${a.entradasAutomaticas} entradas de material foram registradas automaticamente.`}>
          <table className="tabela">
            <tbody>
              <tr><td>Propostas registradas</td><td className="text-right font-medium">{a.propostas.total}</td></tr>
              <tr><td>Digitadas pelo comprador (registro manual)</td><td className="text-right font-medium">{a.propostas.digitadasComprador}</td></tr>
              <tr><td>Enviadas pelo fornecedor ou simuladas (sem redigitação)</td><td className="text-right font-medium">{a.propostas.total - a.propostas.digitadasComprador}</td></tr>
              <tr><td>Leituras do estoque pela API</td><td className="text-right font-medium">{a.sincronizacoes.total} ({a.sincronizacoes.falhas} com falha)</td></tr>
              <tr><td>Entradas no estoque feitas pelo sistema</td><td className="text-right font-medium">{a.entradasAutomaticas}</td></tr>
              <tr><td>E-mails gerados a partir dos dados (sem redigitar)</td><td className="text-right font-medium">{a.emails}</td></tr>
            </tbody>
          </table>
        </Hipotese>

        <Hipotese codigo="H3" titulo="Melhor informação para a decisão com múltiplos critérios"
          conclusao={`cada decisão comparou em média ${a.fornecedoresComparados.toFixed(1)} fornecedores em 4 critérios ponderados. O comprador seguiu a recomendação em ${pct(a.seguiram, a.totalDecisoes)} dos casos e todas as ${a.divergencias} escolhas diferentes foram justificadas (${a.divergenciasJustificadas}/${a.divergencias}).`}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Critérios: preço, prazo de entrega, disponibilidade e histórico do fornecedor, com pesos configuráveis.</li>
            <li>Regras adicionais: quantidade mínima de compra, atendimento parcial e itens que o fornecedor não possui.</li>
            <li>Simulação de pesos (e se?) para testar a robustez da recomendação antes de decidir.</li>
            <li>Relatório de apoio à decisão com o ranking, as notas e a composição da pontuação.</li>
          </ul>
        </Hipotese>

        <Hipotese codigo="H4" titulo="Transparência, rastreabilidade e controle"
          conclusao={`todas as ${a.totalDecisoes} decisões guardam o ranking, os pesos, o responsável e a justificativa do momento da aprovação, e ${a.logs} operações estão registradas no log.`}>
          <table className="tabela">
            <tbody>
              <tr><td>Cotações registradas</td><td className="text-right font-medium">{a.cotacoes}</td></tr>
              <tr><td>Decisões com ranking e pesos guardados</td><td className="text-right font-medium">{a.totalDecisoes} de {a.totalDecisoes}</td></tr>
              <tr><td>Operações no log (quem, quando, o quê)</td><td className="text-right font-medium">{a.logs}</td></tr>
              <tr><td>E-mails guardados na caixa de saída</td><td className="text-right font-medium">{a.emails}</td></tr>
              <tr><td>Tempo médio entre aprovação e pagamento</td><td className="text-right font-medium">{a.tempos.pagamentoMs ? duracao(a.tempos.pagamentoMs) : "-"}</td></tr>
            </tbody>
          </table>
        </Hipotese>
      </div>
    </div>
  );
}
