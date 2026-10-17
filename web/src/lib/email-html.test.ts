import { describe, expect, it } from "vitest";
import { emailHtml } from "./email-html";

describe("modelo HTML dos e-mails", () => {
  const corpo = [
    "Olá, Ana.",
    "",
    "ITENS",
    "  - Dipirona 500mg: 10 AMP x R$ 1,00 = R$ 10,00",
    "  - Luva <M>: 5 CX x R$ 2,00 = R$ 10,00",
    "",
    "Valor total: R$ 20,00",
    "http://localhost:3000/responder/abc",
    "",
    "Setor de Compras · Hospital Regional",
  ].join("\n");
  const html = emailHtml("Pedido de cotação #1", corpo, "Hospital Regional");

  it("transforma o link em botão com o rótulo certo", () => {
    expect(html).toContain('href="http://localhost:3000/responder/abc"');
    expect(html).toContain("Responder cotação");
  });
  it("monta a tabela de itens com o valor separado", () => {
    expect(html).toMatch(/Dipirona 500mg: 10 AMP x R\$ 1,00<\/td><td[^>]*>R\$ 10,00/);
  });
  it("escapa HTML vindo dos dados", () => {
    expect(html).toContain("Luva &lt;M&gt;");
    expect(html).not.toContain("Luva <M>");
  });
  it("leva a assinatura para o rodapé e destaca o total", () => {
    expect(html).toContain("<strong>Valor total:</strong>");
    expect(html.indexOf("Setor de Compras · Hospital Regional")).toBeGreaterThan(html.indexOf("Responder cotação"));
  });
});
