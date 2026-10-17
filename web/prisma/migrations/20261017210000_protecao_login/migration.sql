-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "tentativasFalhas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "travadoAte" TIMESTAMP(3);

