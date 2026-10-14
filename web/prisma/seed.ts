/**
 * Dados de demonstração (fictícios) para validação acadêmica do protótipo.
 * Os SKUs coincidem com os da API de Estoque simulada.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { classificarPropostas, PESOS_PADRAO } from "../src/lib/pontuacao";

const prisma = new PrismaClient();

const produtos = [
  { sku: "PAP-001", nome: "Papel sulfite A4 75g (resma 500 fls)", unidade: "RESMA", estoqueMinimo: 20, estoqueAtual: 12, precoReferencia: 27.9 },
  { sku: "TON-002", nome: "Toner impressora HP 105A", unidade: "UN", estoqueMinimo: 5, estoqueAtual: 3, precoReferencia: 189.0 },
  { sku: "CAF-003", nome: "Café torrado e moído 500g", unidade: "PCT", estoqueMinimo: 15, estoqueAtual: 40, precoReferencia: 21.5 },
  { sku: "COP-004", nome: "Copo descartável 200ml (cento)", unidade: "PCT", estoqueMinimo: 10, estoqueAtual: 8, precoReferencia: 6.4 },
  { sku: "ALC-005", nome: "Álcool em gel 70% 500ml", unidade: "UN", estoqueMinimo: 10, estoqueAtual: 25, precoReferencia: 9.9 },
  { sku: "DET-006", nome: "Detergente neutro 500ml", unidade: "UN", estoqueMinimo: 12, estoqueAtual: 6, precoReferencia: 2.79 },
  { sku: "PTO-007", nome: "Papel toalha interfolhado (fardo)", unidade: "FD", estoqueMinimo: 6, estoqueAtual: 4, precoReferencia: 64.0 },
  { sku: "CAN-008", nome: "Caneta esferográfica azul (cx 50)", unidade: "CX", estoqueMinimo: 4, estoqueAtual: 10, precoReferencia: 39.9 },
  { sku: "GRA-009", nome: "Grampo 26/6 (cx 5000)", unidade: "CX", estoqueMinimo: 5, estoqueAtual: 15, precoReferencia: 8.5 },
  { sku: "SAC-010", nome: "Saco de lixo 100L (pct 100)", unidade: "PCT", estoqueMinimo: 5, estoqueAtual: 2, precoReferencia: 45.0 },
  { sku: "LAM-011", nome: "Lâmpada LED tubular 18W", unidade: "UN", estoqueMinimo: 10, estoqueAtual: 30, precoReferencia: 14.9 },
  { sku: "PIL-012", nome: "Pilha alcalina AA (cartela 4)", unidade: "CART", estoqueMinimo: 10, estoqueAtual: 18, precoReferencia: 17.9 },
  { sku: "AGU-013", nome: "Água mineral galão 20L", unidade: "UN", estoqueMinimo: 8, estoqueAtual: 5, precoReferencia: 12.0 },
  { sku: "PAS-014", nome: "Pasta suspensa kraft", unidade: "UN", estoqueMinimo: 50, estoqueAtual: 120, precoReferencia: 2.2 },
  { sku: "LUV-015", nome: "Luva nitrílica (cx 100)", unidade: "CX", estoqueMinimo: 6, estoqueAtual: 9, precoReferencia: 38.0 },
];

const fornecedores = [
  { nome: "Papelaria Central Ltda", cnpj: "12345678000101", email: "vendas@papelariacentral.com.br", telefone: "(27) 3721-1000", contato: "Ana Souza", notaHistorico: 4.6 },
  { nome: "Distribuidora Capixaba de Suprimentos", cnpj: "23456789000102", email: "comercial@capixabasup.com.br", telefone: "(27) 3722-2000", contato: "Carlos Lima", notaHistorico: 4.1 },
  { nome: "Atacadão Escritório & Cia", cnpj: "34567890000103", email: "cotacao@atacadaoescritorio.com.br", telefone: "(27) 3723-3000", contato: "Fernanda Reis", notaHistorico: 3.2 },
  { nome: "Limpa Bem Produtos de Limpeza", cnpj: "45678901000104", email: "pedidos@limpabem.com.br", telefone: "(27) 3724-4000", contato: "João Pedro", notaHistorico: 3.8 },
  { nome: "MegaSupri Comércio Online", cnpj: "56789012000105", email: "b2b@megasupri.com.br", telefone: "(11) 4000-5000", contato: "Mariana Alves", notaHistorico: 2.3 },
  { nome: "Colatina Office Store", cnpj: "67890123000106", email: "loja@colatinaoffice.com.br", telefone: "(27) 3725-6000", contato: "Ricardo Gomes", notaHistorico: 4.9 },
];

function diasAtras(dias: number, horas = 0) {
  return new Date(Date.now() - dias * 86400000 - horas * 3600000);
}

async function main() {
  // Sem --reset, só carrega os dados de demonstração em um banco vazio
  if (!process.argv.includes("--reset") && (await prisma.usuario.count()) > 0) {
    console.log("Banco já possui dados; seed ignorado (use --reset para recarregar).");
    return;
  }
  await prisma.log.deleteMany();
  await prisma.decisao.deleteMany();
  await prisma.proposta.deleteMany();
  await prisma.cotacao.deleteMany();
  await prisma.necessidadeCompra.deleteMany();
  await prisma.sincronizacao.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.fornecedor.deleteMany();
  await prisma.usuario.deleteMany();

  const senhaHash = await bcrypt.hash("123456", 10);
  const admin = await prisma.usuario.create({ data: { nome: "Administrador", email: "admin@compracerta.com", senhaHash, perfil: "ADMIN" } });
  const gestor = await prisma.usuario.create({ data: { nome: "Gestora de Compras", email: "gestor@compracerta.com", senhaHash, perfil: "GESTOR" } });
  const comprador = await prisma.usuario.create({ data: { nome: "Comprador", email: "comprador@compracerta.com", senhaHash, perfil: "COMPRADOR" } });

  await prisma.configuracaoPesos.upsert({ where: { id: 1 }, create: { id: 1, ...PESOS_PADRAO }, update: PESOS_PADRAO });

  const prods = new Map<string, Awaited<ReturnType<typeof prisma.produto.create>>>();
  for (const p of produtos) prods.set(p.sku, await prisma.produto.create({ data: { ...p, ultimaSincronizacao: diasAtras(1) } }));
  const forns: Awaited<ReturnType<typeof prisma.fornecedor.create>>[] = [];
  for (const f of fornecedores) forns.push(await prisma.fornecedor.create({ data: f }));

  // Histórico de cotações já decididas, para o dashboard e os relatórios
  const historico = [
    { sku: "CAF-003", dias: 28, qtd: 30, propostas: [[0, 22.9, 3, 30], [1, 20.5, 6, 30], [4, 18.9, 15, 30], [5, 23.5, 7, 40]] },
    { sku: "PAP-001", dias: 21, qtd: 40, propostas: [[0, 26.5, 2, 50], [2, 24.9, 5, 40], [4, 23.0, 12, 20], [5, 27.9, 1, 60]] },
    { sku: "ALC-005", dias: 14, qtd: 20, propostas: [[3, 9.5, 3, 20], [1, 10.2, 4, 25], [4, 8.4, 10, 20]] },
    { sku: "LUV-015", dias: 9, qtd: 12, propostas: [[3, 36.0, 4, 12], [1, 35.0, 7, 10], [5, 39.9, 2, 15], [4, 31.5, 14, 12]] },
    { sku: "CAN-008", dias: 4, qtd: 8, propostas: [[0, 38.5, 3, 10], [2, 34.9, 6, 8], [5, 41.0, 6, 8]] },
  ] as const;

  for (const h of historico) {
    const produto = prods.get(h.sku)!;
    const criado = diasAtras(h.dias, 3);
    const necessidade = await prisma.necessidadeCompra.create({
      data: { produtoId: produto.id, quantidade: h.qtd, estoqueNoMomento: Math.floor(produto.estoqueMinimo * 0.6), estoqueMinimo: produto.estoqueMinimo, status: "ATENDIDA", origem: "AUTOMATICA", criadoEm: criado },
    });
    const cotacao = await prisma.cotacao.create({ data: { necessidadeId: necessidade.id, criadoPorId: comprador.id, status: "APROVADA", criadoEm: diasAtras(h.dias, 2), encerradaEm: diasAtras(h.dias, 1) } });
    const criadas = [];
    for (const [fi, preco, prazo, disp] of h.propostas) {
      criadas.push(await prisma.proposta.create({
        data: { cotacaoId: cotacao.id, fornecedorId: forns[fi].id, precoUnitario: preco, prazoEntregaDias: prazo, quantidadeDisponivel: disp, origem: "SIMULADA", criadoEm: diasAtras(h.dias, 2) },
      }));
    }
    const ranking = classificarPropostas(
      criadas.map((p) => {
        const f = forns.find((x) => x.id === p.fornecedorId)!;
        return { id: p.id, fornecedor: f.nome, precoUnitario: p.precoUnitario, prazoEntregaDias: p.prazoEntregaDias, quantidadeDisponivel: p.quantidadeDisponivel, quantidadeMinima: p.quantidadeMinima, notaHistorico: f.notaHistorico };
      }),
      h.qtd,
      PESOS_PADRAO,
    );
    // Na cotação de luvas o gestor escolheu a 2ª colocada, com justificativa
    const divergiu = h.sku === "LUV-015";
    const escolhida = divergiu ? ranking[1] : ranking[0];
    await prisma.decisao.create({
      data: {
        cotacaoId: cotacao.id,
        propostaId: escolhida.id,
        gestorId: gestor.id,
        pontuacao: escolhida.pontuacao,
        ranking: ranking as unknown as Prisma.InputJsonValue,
        pesos: PESOS_PADRAO,
        seguiuRecomendacao: !divergiu,
        justificativa: divergiu ? "Fornecedor já homologado pela equipe de segurança do trabalho" : null,
        decididoEm: diasAtras(h.dias, 1),
        ...(h.dias > 5 ? { recebidoEm: diasAtras(h.dias - escolhida.prazoEntregaDias), entregueNoPrazo: true, avaliacao: 5 } : {}),
      },
    });
    await prisma.log.create({ data: { usuarioId: gestor.id, acao: "COMPRA_APROVADA", entidade: "Cotacao", entidadeId: cotacao.id, detalhes: `${escolhida.fornecedor} (${escolhida.pontuacao} pts)`, criadoEm: diasAtras(h.dias, 1) } });
  }

  await prisma.log.create({ data: { usuarioId: admin.id, acao: "CARGA_INICIAL", entidade: "Sistema", detalhes: "Dados de demonstração carregados" } });
  console.log(`Seed concluído: ${produtos.length} produtos, ${fornecedores.length} fornecedores, ${historico.length} cotações históricas.`);
}

main().finally(() => prisma.$disconnect());
