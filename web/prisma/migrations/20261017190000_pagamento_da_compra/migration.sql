-- AlterTable
ALTER TABLE "Decisao" ADD COLUMN     "formaPagamento" TEXT,
ADD COLUMN     "pagamentoReferencia" TEXT,
ADD COLUMN     "pagoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Fornecedor" ADD COLUMN     "dadosPagamento" TEXT;

-- AlterTable
ALTER TABLE "Proposta" ADD COLUMN     "formaPagamento" TEXT NOT NULL DEFAULT 'BOLETO_28';

UPDATE "Decisao" SET "pagoEm" = "decididoEm" WHERE "recebidoEm" IS NOT NULL;
