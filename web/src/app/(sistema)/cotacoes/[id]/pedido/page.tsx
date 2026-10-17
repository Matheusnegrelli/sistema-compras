import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Logo } from "@/components/Logo";
import { data, dataHora, formatarCnpj, moeda } from "@/lib/formato";
import { carregarPedido } from "@/lib/pedido";
import { NOME_HOSPITAL } from "@/lib/solicitacoes";

export const metadata = { title: "Pedido de compra | Provisa" };

export default async function Pedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pedido = await carregarPedido(Number(id));
  if (!pedido) notFound();
  const { cotacao, decisao, fornecedor, itens, total, prazo, entregaPrevista, forma, venceEm } = pedido;

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 shadow-sm print:p-0 print:shadow-none">
      <div className="nao-imprimir mb-6 flex justify-end"><BotaoImprimir /></div>
      <div className="border-b border-slate-200 pb-4">
        <div className="mb-3 flex items-center justify-between"><Logo /><p className="text-xs uppercase tracking-wide text-slate-500">Pedido de compra</p></div>
        <h1 className="mt-1">Pedido de compra nº {cotacao.id}</h1>
        <p className="text-sm text-slate-500">
          Emitido em {dataHora(decisao.decididoEm)} · Cotação #{cotacao.id} ({cotacao.categoria})
          {decisao.pedidoEnviadoEm && <> · enviado por e-mail em {dataHora(decisao.pedidoEnviadoEm)}</>}
        </p>
      </div>

      <section className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Comprador</p>
          <p className="font-medium">{NOME_HOSPITAL}</p>
          <p>Setor de Compras · {decisao.gestor.nome}</p>
          <p>Entrega: Almoxarifado</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Fornecedor</p>
          <p className="font-medium">{fornecedor.nome}</p>
          <p>CNPJ {formatarCnpj(fornecedor.cnpj)}</p>
          <p>{[fornecedor.contato, fornecedor.email, fornecedor.telefone].filter(Boolean).join(" · ")}</p>
        </div>
      </section>

      <section className="mt-6 text-sm">
        <table className="tabela">
          <thead><tr><th>Código</th><th>Produto</th><th>Quantidade</th><th>Preço unit.</th><th className="text-right">Valor</th></tr></thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.necessidadeId}>
                <td className="font-mono text-xs">{i.produto.sku}</td>
                <td>{i.produto.nome}</td>
                <td>{i.quantidadeCompra} {i.produto.unidade}</td>
                <td>{moeda(i.precoUnitario)}</td>
                <td className="text-right">{moeda(i.valor)}</td>
              </tr>
            ))}
            <tr><td colSpan={4} className="text-right font-semibold">Valor total</td><td className="text-right font-semibold">{moeda(total)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <p><strong>Prazo de entrega:</strong> {prazo} dia(s), previsão {data(entregaPrevista)}</p>
        <p><strong>Forma de pagamento:</strong> {forma.rotulo}, vencimento {data(venceEm)}</p>
        <p><strong>Situação:</strong> {decisao.recebidoEm ? `recebido em ${dataHora(decisao.recebidoEm)}` : decisao.pagoEm ? `pago em ${dataHora(decisao.pagoEm)}, aguardando entrega` : "aguardando pagamento"}</p>
      </section>

      <p className="mt-10 border-t border-slate-200 pt-3 text-xs text-slate-500">
        Pedido gerado a partir da proposta selecionada pelo comprador na cotação #{cotacao.id}. Confirme o recebimento deste pedido e informe a nota fiscal na entrega.
      </p>
    </div>
  );
}
