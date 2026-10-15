import { prisma } from "@/lib/db";
import { Aviso } from "@/components/ui";
import { dataHora, moeda } from "@/lib/formato";
import { NOME_HOSPITAL } from "@/lib/solicitacoes";
import { responderCotacao } from "@/acoes/fornecedor";
import { IconeLogo } from "@/components/Logo";

export const metadata = { title: "Responder cotação | Provisa" };

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
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
      cotacao: { include: { necessidade: { include: { produto: { include: { setor: true } } } } } },
    },
  });
  if (!s) {
    return <Moldura><div className="card">Este link de cotação não é válido. Confira o endereço recebido por e-mail.</div></Moldura>;
  }
  if (!s.visualizadoEm) await prisma.solicitacaoCotacao.update({ where: { id: s.id }, data: { visualizadoEm: new Date() } });
  const { cotacao } = s;
  const { produto, quantidade } = cotacao.necessidade;
  const proposta = await prisma.proposta.findUnique({ where: { cotacaoId_fornecedorId: { cotacaoId: cotacao.id, fornecedorId: s.fornecedorId } } });
  const prazoEncerrado = cotacao.prazoResposta ? cotacao.prazoResposta < new Date() : false;
  const podeResponder = cotacao.status === "ABERTA" && !prazoEncerrado;

  return (
    <Moldura>
      <Aviso searchParams={searchParams} />
      <div className="card mb-5">
        <p className="text-sm text-slate-500">Fornecedor</p>
        <p className="mb-4 font-semibold">{s.fornecedor.nome}</p>
        <h1 className="mb-1 text-xl">Cotação #{cotacao.id} · {produto.nome}</h1>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-slate-500">Código</dt><dd className="font-mono">{produto.sku}</dd></div>
          <div><dt className="text-slate-500">Quantidade</dt><dd className="font-semibold">{quantidade} {produto.unidade}</dd></div>
          <div><dt className="text-slate-500">Setor solicitante</dt><dd>{produto.setor?.nome ?? "-"}</dd></div>
          <div><dt className="text-slate-500">Responder até</dt><dd>{dataHora(cotacao.prazoResposta)}</dd></div>
        </dl>
      </div>

      {!podeResponder ? (
        <div className="card text-sm text-slate-600">
          {cotacao.status !== "ABERTA" ? "Esta cotação já foi encerrada pelo hospital." : "O prazo para responder esta cotação terminou."}
          {proposta && <> Sua proposta registrada: {moeda(proposta.precoUnitario)}/un, entrega em {proposta.prazoEntregaDias} dia(s).</>}
        </div>
      ) : (
        <form action={responderCotacao} className="card space-y-4">
          <input type="hidden" name="token" value={s.token} />
          <h2>{proposta ? "Sua proposta (você pode alterar até o prazo)" : "Enviar proposta"}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="rotulo">Preço unitário (R$)</label><input className="campo" name="precoUnitario" type="number" step="0.01" min="0.01" required defaultValue={proposta?.precoUnitario} /></div>
            <div><label className="rotulo">Prazo de entrega (dias)</label><input className="campo" name="prazoEntregaDias" type="number" min={0} required defaultValue={proposta?.prazoEntregaDias} /></div>
            <div><label className="rotulo">Quantidade disponível</label><input className="campo" name="quantidadeDisponivel" type="number" min={0} required defaultValue={proposta?.quantidadeDisponivel ?? quantidade} /></div>
            <div><label className="rotulo">Quantidade mínima de venda</label><input className="campo" name="quantidadeMinima" type="number" min={1} defaultValue={proposta?.quantidadeMinima ?? 1} /></div>
          </div>
          <div><label className="rotulo">Observação (opcional)</label><input className="campo" name="observacao" defaultValue={proposta?.observacao ?? ""} /></div>
          <button className="btn-primario w-full sm:w-auto">{proposta ? "Atualizar proposta" : "Enviar proposta"}</button>
          <p className="text-xs text-slate-500">As propostas são comparadas por preço, prazo, disponibilidade e histórico de entregas. A escolha final é do comprador do hospital.</p>
        </form>
      )}
    </Moldura>
  );
}
