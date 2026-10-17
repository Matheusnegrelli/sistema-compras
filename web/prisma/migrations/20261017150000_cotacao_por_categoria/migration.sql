-- Cotação passa a reunir vários itens da mesma categoria. As cotações antigas (um item cada)
-- são apagadas; rode "npm run db:seed" para recarregar os dados de demonstração.
DELETE FROM "EmailEnviado";
DELETE FROM "SolicitacaoCotacao";
DELETE FROM "Decisao";
DELETE FROM "Proposta";
DELETE FROM "Cotacao";
UPDATE "NecessidadeCompra" SET "status" = 'ABERTA' WHERE "status" = 'EM_COTACAO';

-- DropForeignKey
ALTER TABLE "Cotacao" DROP CONSTRAINT "Cotacao_necessidadeId_fkey";

-- DropIndex
DROP INDEX "Cotacao_necessidadeId_key";

-- AlterTable
ALTER TABLE "Cotacao" DROP COLUMN "necessidadeId",
ADD COLUMN     "categoria" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "NecessidadeCompra" ADD COLUMN     "cotacaoId" INTEGER;

-- AlterTable
ALTER TABLE "Proposta" DROP COLUMN "precoUnitario",
DROP COLUMN "quantidadeDisponivel",
DROP COLUMN "quantidadeMinima";

-- CreateTable
CREATE TABLE "ItemProposta" (
    "id" SERIAL NOT NULL,
    "propostaId" INTEGER NOT NULL,
    "necessidadeId" INTEGER NOT NULL,
    "precoUnitario" DOUBLE PRECISION NOT NULL,
    "quantidadeDisponivel" INTEGER NOT NULL,
    "quantidadeMinima" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ItemProposta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemProposta_propostaId_necessidadeId_key" ON "ItemProposta"("propostaId", "necessidadeId");

-- AddForeignKey
ALTER TABLE "NecessidadeCompra" ADD CONSTRAINT "NecessidadeCompra_cotacaoId_fkey" FOREIGN KEY ("cotacaoId") REFERENCES "Cotacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProposta" ADD CONSTRAINT "ItemProposta_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "Proposta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProposta" ADD CONSTRAINT "ItemProposta_necessidadeId_fkey" FOREIGN KEY ("necessidadeId") REFERENCES "NecessidadeCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

