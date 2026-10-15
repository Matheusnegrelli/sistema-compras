-- CreateEnum
CREATE TYPE "StatusEmail" AS ENUM ('ENVIADO', 'DEMONSTRACAO', 'FALHOU');

-- AlterEnum
ALTER TYPE "Origem" ADD VALUE 'FORNECEDOR';

-- AlterTable
ALTER TABLE "ConfiguracaoPesos" ADD COLUMN     "envioAutomatico" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "prazoRespostaHoras" INTEGER NOT NULL DEFAULT 48;

-- AlterTable
ALTER TABLE "Cotacao" ADD COLUMN     "prazoResposta" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SolicitacaoCotacao" (
    "id" SERIAL NOT NULL,
    "cotacaoId" INTEGER NOT NULL,
    "fornecedorId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visualizadoEm" TIMESTAMP(3),
    "respondidoEm" TIMESTAMP(3),

    CONSTRAINT "SolicitacaoCotacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEnviado" (
    "id" SERIAL NOT NULL,
    "solicitacaoId" INTEGER,
    "para" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "status" "StatusEmail" NOT NULL,
    "erro" TEXT,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEnviado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoCotacao_token_key" ON "SolicitacaoCotacao"("token");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoCotacao_cotacaoId_fornecedorId_key" ON "SolicitacaoCotacao"("cotacaoId", "fornecedorId");

-- CreateIndex
CREATE INDEX "EmailEnviado_enviadoEm_idx" ON "EmailEnviado"("enviadoEm");

-- AddForeignKey
ALTER TABLE "SolicitacaoCotacao" ADD CONSTRAINT "SolicitacaoCotacao_cotacaoId_fkey" FOREIGN KEY ("cotacaoId") REFERENCES "Cotacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoCotacao" ADD CONSTRAINT "SolicitacaoCotacao_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEnviado" ADD CONSTRAINT "EmailEnviado_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoCotacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
