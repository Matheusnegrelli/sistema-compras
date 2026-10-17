/**
 * Dados de demonstração (fictícios) de um hospital para validação acadêmica do protótipo.
 * Os SKUs coincidem com os da API de Estoque simulada.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { classificarPropostas, PESOS_PADRAO } from "../src/lib/pontuacao";
import { fornecedores, produtos, setores } from "./dados-hospital";

const prisma = new PrismaClient();

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
  await prisma.emailEnviado.deleteMany();
  await prisma.itemProposta.deleteMany();
  await prisma.solicitacaoCotacao.deleteMany();
  await prisma.decisao.deleteMany();
  await prisma.proposta.deleteMany();
  await prisma.cotacao.deleteMany();
  await prisma.necessidadeCompra.deleteMany();
  await prisma.sincronizacao.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.fornecedor.deleteMany();
  await prisma.setor.deleteMany();
  await prisma.usuario.deleteMany();

  const senhaHash = await bcrypt.hash("123456", 10);
  const admin = await prisma.usuario.create({ data: { nome: "Administrador", email: "admin@provisa.com", senhaHash, perfil: "ADMIN" } });
  await prisma.usuario.create({ data: { nome: "Gestora de Suprimentos", email: "gestor@provisa.com", senhaHash, perfil: "GESTOR" } });
  const comprador = await prisma.usuario.create({ data: { nome: "Comprador", email: "comprador@provisa.com", senhaHash, perfil: "COMPRADOR" } });

  // Na demonstração o comprador gera cada cotação clicando no item (o envio automático pode ser ligado em Configurações)
  await prisma.configuracaoPesos.upsert({ where: { id: 1 }, create: { id: 1, ...PESOS_PADRAO, envioAutomatico: false }, update: { ...PESOS_PADRAO, envioAutomatico: false } });

  const setorIds = new Map<string, number>();
  for (const s of setores) setorIds.set(s.sigla, (await prisma.setor.create({ data: s })).id);

  const prods = new Map<string, Awaited<ReturnType<typeof prisma.produto.create>>>();
  for (const { setor, estoqueInicial, ...p } of produtos) {
    prods.set(p.sku, await prisma.produto.create({
      data: { ...p, setorId: setorIds.get(setor)!, estoqueAtual: estoqueInicial, ultimaSincronizacao: diasAtras(1) },
    }));
  }
  const forns: Awaited<ReturnType<typeof prisma.fornecedor.create>>[] = [];
  for (const f of fornecedores) forns.push(await prisma.fornecedor.create({ data: f }));

  // Histórico de cotações já decididas (uma por categoria), para o dashboard e os relatórios
  // propostas: [fornecedor, fator sobre o preço de referência, prazo em dias, fator da quantidade disponível]
  const historico = [
    { categoria: "Medicamento", dias: 28, itens: [["FAR-003", 60]], propostas: [[0, 1.02, 2, 1], [1, 0.95, 6, 1], [4, 0.84, 15, 1], [5, 1.08, 7, 1.3]] },
    { categoria: "EPI", dias: 21, itens: [["CC-002", 120], ["PS-003", 90]], propostas: [[0, 0.98, 2, 1.2], [2, 0.9, 5, 1], [4, 0.82, 12, 0.5], [5, 1.05, 1, 1.5]] },
    { categoria: "Material médico-hospitalar", dias: 14, itens: [["UTI-002", 80]], propostas: [[3, 0.97, 3, 1], [1, 1.03, 4, 1.2], [4, 0.85, 10, 1]] },
    { categoria: "Higiene do paciente", dias: 9, itens: [["INT-001", 70]], propostas: [[3, 0.95, 4, 1], [1, 0.93, 7, 0.8], [5, 1.06, 2, 1.2], [4, 0.8, 14, 1]] },
    { categoria: "Limpeza e desinfecção", dias: 6, itens: [["HIG-002", 20]], propostas: [[0, 1.01, 3, 1.2], [2, 0.92, 6, 1], [5, 1.1, 6, 1]] },
    { categoria: "Laboratório", dias: 3, itens: [["LAB-002", 6], ["LAB-001", 16]], propostas: [[0, 1.0, 5, 1], [3, 0.94, 8, 1], [1, 1.04, 3, 1]] },
  ] as const;

  for (const h of historico) {
    const cotacao = await prisma.cotacao.create({ data: { categoria: h.categoria, criadoPorId: comprador.id, status: "APROVADA", criadoEm: diasAtras(h.dias, 2), encerradaEm: diasAtras(h.dias, 1) } });
    const itens = [];
    for (const [sku, qtd] of h.itens) {
      const produto = prods.get(sku)!;
      itens.push({
        produto,
        necessidade: await prisma.necessidadeCompra.create({
          data: { produtoId: produto.id, quantidade: qtd, estoqueNoMomento: Math.floor(produto.estoqueMinimo * 0.6), estoqueMinimo: produto.estoqueMinimo, status: "ATENDIDA", origem: "AUTOMATICA", criadoEm: diasAtras(h.dias, 3), cotacaoId: cotacao.id },
        }),
      });
    }
    const criadas = [];
    for (const [fi, fatorPreco, prazo, fatorDisp] of h.propostas) {
      criadas.push(await prisma.proposta.create({
        data: {
          cotacaoId: cotacao.id, fornecedorId: forns[fi].id, prazoEntregaDias: prazo, origem: "SIMULADA", criadoEm: diasAtras(h.dias, 2),
          itens: {
            create: itens.map(({ produto, necessidade }) => ({
              necessidadeId: necessidade.id,
              precoUnitario: Math.round(produto.precoReferencia! * fatorPreco * 100) / 100,
              quantidadeDisponivel: Math.round(necessidade.quantidade * fatorDisp),
            })),
          },
        },
        include: { itens: true },
      }));
    }
    const ranking = classificarPropostas(
      criadas.map((p) => {
        const f = forns.find((x) => x.id === p.fornecedorId)!;
        return { id: p.id, fornecedor: f.nome, prazoEntregaDias: p.prazoEntregaDias, notaHistorico: f.notaHistorico, itens: p.itens };
      }),
      itens.map(({ produto, necessidade }) => ({ necessidadeId: necessidade.id, produto: produto.nome, quantidade: necessidade.quantidade })),
      PESOS_PADRAO,
    );
    // Na cotação de fraldas o comprador escolheu a 2ª colocada, com justificativa
    const divergiu = h.categoria === "Higiene do paciente";
    const escolhida = divergiu ? ranking[1] : ranking[0];
    await prisma.decisao.create({
      data: {
        cotacaoId: cotacao.id,
        propostaId: escolhida.id,
        gestorId: comprador.id,
        pontuacao: escolhida.pontuacao,
        ranking: ranking as unknown as Prisma.InputJsonValue,
        pesos: PESOS_PADRAO,
        seguiuRecomendacao: !divergiu,
        justificativa: divergiu ? "Produto já homologado pela Comissão de Padronização do hospital" : null,
        decididoEm: diasAtras(h.dias, 1),
        ...(h.dias > 5 ? { recebidoEm: diasAtras(h.dias - escolhida.prazoEntregaDias), entregueNoPrazo: true, avaliacao: 5 } : {}),
      },
    });
    await prisma.log.create({ data: { usuarioId: comprador.id, acao: "COMPRA_APROVADA", entidade: "Cotacao", entidadeId: cotacao.id, detalhes: `${escolhida.fornecedor} (${escolhida.pontuacao} pts)`, criadoEm: diasAtras(h.dias, 1) } });
  }

  await prisma.log.create({ data: { usuarioId: admin.id, acao: "CARGA_INICIAL", entidade: "Sistema", detalhes: "Dados de demonstração carregados" } });
  console.log(`Seed concluído: ${setores.length} setores, ${produtos.length} produtos, ${fornecedores.length} fornecedores, ${historico.length} cotações históricas.`);
}

main().finally(() => prisma.$disconnect());
