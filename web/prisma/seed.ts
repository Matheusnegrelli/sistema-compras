/** Carga inicial do banco com os dados de demonstração (npm run db:seed recarrega do zero). */
import { PrismaClient } from "@prisma/client";
import { carregarDadosDemonstracao } from "../src/lib/dados-demonstracao";

const prisma = new PrismaClient();

async function main() {
  // Sem --reset, só carrega os dados de demonstração em um banco vazio
  if (!process.argv.includes("--reset") && (await prisma.usuario.count()) > 0) {
    console.log("Banco já possui dados; seed ignorado (use --reset para recarregar).");
    return;
  }
  const r = await carregarDadosDemonstracao(prisma);
  console.log(`Seed concluído: ${r.setores} setores, ${r.produtos} produtos, ${r.fornecedores} fornecedores, ${r.historico} cotações históricas.`);
}

main().finally(() => prisma.$disconnect());
