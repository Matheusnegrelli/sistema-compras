import { obterSessao } from "@/lib/auth";
import { gerarPedidoPdf } from "@/lib/pedido-pdf";

export const dynamic = "force-dynamic";

/** Baixa o pedido de compra em PDF (o mesmo arquivo anexado ao e-mail do fornecedor). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await obterSessao())) return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  const pdf = await gerarPedidoPdf(Number(id));
  if (!pdf) return new Response("Pedido não encontrado", { status: 404 });
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="pedido-de-compra-${id}.pdf"` },
  });
}
