-- CreateEnum
CREATE TYPE "Criticidade" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "categoria" TEXT NOT NULL DEFAULT 'Material médico-hospitalar',
ADD COLUMN     "criticidade" "Criticidade" NOT NULL DEFAULT 'MEDIA',
ADD COLUMN     "setorId" INTEGER;

-- CreateTable
CREATE TABLE "Setor" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "responsavel" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Setor_nome_key" ON "Setor"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Setor_sigla_key" ON "Setor"("sigla");

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "Setor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
