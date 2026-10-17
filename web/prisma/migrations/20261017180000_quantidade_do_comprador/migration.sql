-- AlterTable
ALTER TABLE "NecessidadeCompra" ADD COLUMN     "quantidadeComprada" INTEGER,
ADD COLUMN     "quantidadeSugerida" INTEGER;

UPDATE "NecessidadeCompra" SET "quantidadeSugerida" = "quantidade" WHERE "origem" = 'AUTOMATICA';
UPDATE "NecessidadeCompra" SET "quantidadeComprada" = "quantidade" WHERE "status" = 'ATENDIDA';
