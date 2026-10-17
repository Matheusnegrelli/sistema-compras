import { prisma } from "@/lib/db";
import { Aviso } from "@/components/ui";
import { IconeLogo } from "@/components/Logo";
import { dataHora, moeda } from "@/lib/formato";
import { NOME_HOSPITAL } from "@/lib/solicitacoes";
import { responderCotacao } from "@/acoes/fornecedor";
import { FORMAS_PAGAMENTO } from "@/lib/pagamento";

export const metadata = { title: "Responder cotação | Provisa" };

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <IconeLogo className="h-10 w-10" />
          <div>
            <p className="font-semibold text-marca-800">{NOME_HOSPITAL}</p>
            <p className="text-xs text-slate-500">Portal do fornecedor · pedido de cotação</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

export default async function Responder({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { token } = await params;
  const s = await prisma.solicitacaoCotacao.findUnique({
    where: { token: decodeURIComponent(token) },
    include: {
      fornecedor: true,
      cotacao: { include: { decisao: { select: { propostaId: true } }, itens: { where: { status: "EM_COTACAO" }, include: { produto: { include: { setor: true } } }, orderBy: { id: "asc" } } } },
    },
  });
  if (!s) {
    return <Moldura><div className="card">Este link de cotação não é válido. Confira o endereço recebido por e-mail.</div></Moldura>;
  }
  if (!s.visualizadoEm) await prisma.solicitacaoCotacao.update({ where: { id: s.id }, data: { visualizadoEm: new Date() } });
  const { cotacao } = s;
  const proposta = await prisma.proposta.findUnique({
    where: { cotacaoId_fornecedorId: { cotacaoId: cotacao.id, fornecedorId: s.fornecedorId } },
    include: { itens: true },
  });
  const doItem = (id: number) => proposta?.itens.find((i) => i.necessidadeId === id);
  const prazoEncerrado = cotacao.prazoResposta ? cotacao.prazoResposta < new Date() : false;
  const podeResponder = cotacao.status === "ABERTA" && !prazoEncerrado;

  return (
    <Moldura>
      <Aviso searchParams={searchParams} />
      <div className="card mb-5">
        <p className="text-sm text-slate-500">Fornecedor</p>
        <p className="mb-4 font-semibold">{s.fornecedor.nome}</p>
        <h1 className="mb-1 text-xl">Cotação #{cotacao.id} · {cotacao.categoria}</h1>
        <p className="text-sm text-slate-500">{cotacao.itens.length} {cotacao.itens.length === 1 ? "item" : "itens"} · responder até {dataHora(cotacao.prazoResposta)}</p>
      </div>

      {!podeResponder ? (
        <div className="card text-sm text-slate-600">
          {cotacao.status !== "ABERTA" ? "Esta cotação já foi encerrada pelo hospital." : "O prazo para responder esta cotação terminou."}
          {proposta && cotacao.decisao?.propostaId === proposta.id
            ? <> <strong className="text-emerald-700">Sua proposta foi selecionada.</strong> O pedido de compra nº {cotacao.id} foi enviado para o seu e-mail.</>
            : proposta && <> Sua proposta foi registrada com entrega em {proposta.prazoEntregaDias} dia(s).</>}
          {s.semItens && <> Você respondeu que não possui nenhum dos itens.</>}
        </div>
      ) : (
        <form action={responderCotacao} className="card space-y-4">
          <input type="hidden" name="token" value={s.token} />
          <h2>{proposta ? "Sua proposta (você pode alterar até o prazo)" : "Enviar proposta"}</h2>
          {s.semItens && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Você informou que não possui nenhum destes itens. Se passar a ter algum, pode enviar a proposta abaixo até o prazo.</p>
          )}
          <p className="text-sm text-slate-500">Informe o preço de cada item. Se você não tiver algum deles, marque "Não tenho" na linha do item.</p>
          <div className="overflow-x-auto">
            <table className="tabela tabela-cartoes">
              <thead><tr><th>Item</th><th>Quantidade</th><th>Preço unit. (R$)</th><th>Qtd. disponível</th><th>Qtd. mínima</th><th>Não tenho</th></tr></thead>
              <tbody>
                {cotacao.itens.map((i) => {
                  const atual = doItem(i.id);
                  return (
                    <tr key={i.id} className="linha-item">
                      <td className="min-w-[180px] text-sm"><span className="font-mono text-xs text-slate-500">{i.produto.sku}</span> {i.produto.nome}</td>
                      <td data-rotulo="Quantidade pedida" className="whitespace-nowrap text-sm font-medium">{i.quantidade} {i.produto.unidade}</td>
                      <td data-rotulo="Preço unit. (R$)"><input className="campo min-w-[90px]" name={`preco_${i.id}`} type="number" step="0.01" min="0.01" defaultValue={atual?.precoUnitario} /></td>
                      <td data-rotulo="Qtd. disponível"><input className="campo min-w-[80px]" name={`disp_${i.id}`} type="number" min={0} defaultValue={atual?.quantidadeDisponivel ?? i.quantidade} /></td>
                      <td data-rotulo="Qtd. mínima"><input className="campo min-w-[70px]" name={`min_${i.id}`} type="number" min={1} defaultValue={atual?.quantidadeMinima ?? 1} /></td>
                      <td className="text-center"><label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-slate-600"><input type="checkbox" name={`sem_${i.id}`} className="h-4 w-4 accent-red-600" defaultChecked={!!proposta && !atual} /> Não tenho</label></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><label className="rotulo">Prazo de entrega de todo o pedido (dias)</label><input className="campo" name="prazoEntregaDias" type="number" min={0} required defaultValue={proposta?.prazoEntregaDias} /></div>
            <div><label className="rotulo">Forma de pagamento</label>
              <select className="campo" name="formaPagamento" required defaultValue={proposta?.formaPagamento ?? ""}>
                <option value="">Selecione</option>
                {FORMAS_PAGAMENTO.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
              </select>
            </div>
            <div><label className="rotulo">Observação (opcional)</label><input className="campo" name="observacao" defaultValue={proposta?.observacao ?? ""} /></div>
          </div>
          {proposta && (
            <p className="text-xs text-slate-500">
              Valor da sua proposta atual: {moeda(proposta.itens.reduce((a, i) => a + i.precoUnitario * (cotacao.itens.find((x) => x.id === i.necessidadeId)?.quantidade ?? 0), 0))}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn-primario w-full sm:w-auto">{proposta ? "Atualizar proposta" : "Enviar proposta"}</button>
            {!s.semItens && (
              <button className="btn-perigo w-full sm:w-auto" name="nenhum" value="1" formNoValidate>Não tenho nenhum destes itens</button>
            )}
          </div>
          <p className="text-xs text-slate-500">As propostas são comparadas por preço, prazo, disponibilidade e histórico de entregas. A escolha final é do comprador do hospital.</p>
        </form>
      )}
    </Moldura>
  );
}
