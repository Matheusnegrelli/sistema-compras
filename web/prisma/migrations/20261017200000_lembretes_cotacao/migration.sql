-- AlterTable
ALTER TABLE "Cotacao" ADD COLUMN     "avisoProntaEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SolicitacaoCotacao" ADD COLUMN     "lembreteEm" TIMESTAMP(3);

UPDATE "Cotacao" SET "avisoProntaEm" = "encerradaEm" WHERE "encerradaEm" IS NOT NULL;
