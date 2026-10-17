import PDFDocument from "pdfkit";
import { data, dataHora, formatarCnpj, moeda } from "./formato";
import { NOME_HOSPITAL, NOME_SISTEMA, SUBTITULO_SISTEMA } from "./marca";
import { carregarPedido } from "./pedido";

const MARCA = "#154c47";
const SUAVE = "#64748b";
const BORDA = "#e2e8f0";

/** Gera o pedido de compra em PDF (o mesmo conteúdo da tela de impressão), para anexar ao e-mail do fornecedor. */
export async function gerarPedidoPdf(cotacaoId: number): Promise<Buffer | null> {
  const pedido = await carregarPedido(cotacaoId);
  if (!pedido) return null;
  const { cotacao, decisao, fornecedor, itens, total, prazo, entregaPrevista, forma, venceEm } = pedido;

  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Pedido de compra nº ${cotacao.id}`, Author: `${NOME_SISTEMA} · ${NOME_HOSPITAL}` } });
  const partes: Buffer[] = [];
  doc.on("data", (p: Buffer) => partes.push(p));
  const fim = new Promise<Buffer>((ok) => doc.on("end", () => ok(Buffer.concat(partes))));
  const largura = doc.page.width - 96;
  const x0 = 48;

  // Cabeçalho com a marca
  doc.roundedRect(x0, 48, 30, 30, 6).fill(MARCA);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(22).text("+", x0, 52, { width: 30, align: "center" });
  doc.fillColor(MARCA).fontSize(16).text(NOME_SISTEMA, x0 + 40, 50);
  doc.fillColor(SUAVE).font("Helvetica").fontSize(8).text(`${SUBTITULO_SISTEMA.toUpperCase()} · ${NOME_HOSPITAL}`, x0 + 40, 69);
  doc.fillColor(SUAVE).fontSize(9).text("PEDIDO DE COMPRA", x0, 56, { width: largura, align: "right" });

  doc.moveTo(x0, 92).lineTo(x0 + largura, 92).strokeColor(BORDA).stroke();
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(18).text(`Pedido de compra nº ${cotacao.id}`, x0, 106);
  doc.fillColor(SUAVE).font("Helvetica").fontSize(9).text(`Emitido em ${dataHora(decisao.decididoEm)} · Cotação #${cotacao.id} (${cotacao.categoria})`);

  // Comprador e fornecedor lado a lado
  const yCaixas = 150;
  const meia = (largura - 12) / 2;
  const caixa = (x: number, titulo: string, linhas: string[]) => {
    doc.roundedRect(x, yCaixas, meia, 78, 6).strokeColor(BORDA).stroke();
    doc.fillColor(SUAVE).font("Helvetica-Bold").fontSize(8).text(titulo, x + 10, yCaixas + 10);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text(linhas[0], x + 10, yCaixas + 24, { width: meia - 20 });
    doc.font("Helvetica").fontSize(9).text(linhas.slice(1).join("\n"), { width: meia - 20 });
  };
  caixa(x0, "COMPRADOR", [NOME_HOSPITAL, `Setor de Compras · ${decisao.gestor.nome}`, "Entrega: Almoxarifado"]);
  caixa(x0 + meia + 12, "FORNECEDOR", [fornecedor.nome, `CNPJ ${formatarCnpj(fornecedor.cnpj)}`, [fornecedor.contato, fornecedor.email, fornecedor.telefone].filter(Boolean).join(" · ")]);

  // Tabela de itens
  const colunas = [
    { titulo: "CÓDIGO", largura: 62, alinhar: "left" as const },
    { titulo: "PRODUTO", largura: largura - 62 - 80 - 80 - 90, alinhar: "left" as const },
    { titulo: "QUANTIDADE", largura: 80, alinhar: "left" as const },
    { titulo: "PREÇO UNIT.", largura: 80, alinhar: "right" as const },
    { titulo: "VALOR", largura: 90, alinhar: "right" as const },
  ];
  let y = 248;
  const linha = (valores: string[], negrito = false, fundo?: string) => {
    doc.font(negrito ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    const altura = Math.max(...valores.map((v, i) => doc.heightOfString(v, { width: colunas[i].largura - 12 }))) + 12;
    if (y + altura > doc.page.height - 90) { doc.addPage(); y = 48; }
    if (fundo) doc.rect(x0, y, largura, altura).fill(fundo);
    let x = x0;
    valores.forEach((v, i) => {
      doc.fillColor(fundo ? SUAVE : "#0f172a").text(v, x + 6, y + 6, { width: colunas[i].largura - 12, align: colunas[i].alinhar });
      x += colunas[i].largura;
    });
    y += altura;
    doc.moveTo(x0, y).lineTo(x0 + largura, y).strokeColor(BORDA).stroke();
  };
  linha(colunas.map((c) => c.titulo), true, "#f8fafc");
  for (const i of itens) linha([i.produto.sku, i.produto.nome, `${i.quantidadeCompra} ${i.produto.unidade}`, moeda(i.precoUnitario), moeda(i.valor)]);
  linha(["", "", "", "Valor total", moeda(total)], true);

  // Condições
  y += 16;
  const condicoes = [
    ["Prazo de entrega", `${prazo} dia(s), previsão ${data(entregaPrevista)}`],
    ["Forma de pagamento", `${forma.rotulo}, vencimento ${data(venceEm)}`],
    ["Local de entrega", `Almoxarifado · ${NOME_HOSPITAL}`],
  ];
  for (const [rotulo, valor] of condicoes) {
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text(`${rotulo}: `, x0, y, { continued: true }).font("Helvetica").text(valor);
    y = doc.y + 4;
  }

  doc.moveTo(x0, y + 20).lineTo(x0 + largura, y + 20).strokeColor(BORDA).stroke();
  doc.fillColor(SUAVE).fontSize(8).text(
    `Pedido gerado pelo ${NOME_SISTEMA} a partir da proposta selecionada pelo comprador na cotação #${cotacao.id}. Confirme o recebimento deste pedido e informe a nota fiscal na entrega.`,
    x0, y + 28, { width: largura },
  );
  doc.end();
  return fim;
}
