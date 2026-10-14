-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMIN', 'COMPRADOR', 'GESTOR');

-- CreateEnum
CREATE TYPE "StatusNecessidade" AS ENUM ('ABERTA', 'EM_COTACAO', 'ATENDIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusCotacao" AS ENUM ('ABERTA', 'APROVADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "Origem" AS ENUM ('AUTOMATICA', 'MANUAL', 'SIMULADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'COMPRADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
    "estoqueAtual" INTEGER NOT NULL DEFAULT 0,
    "quantidadeReposicao" INTEGER,
    "precoReferencia" DOUBLE PRECISION,
    "ultimaSincronizacao" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "contato" TEXT,
    "notaHistorico" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NecessidadeCompra" (
    "id" SERIAL NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "estoqueNoMomento" INTEGER NOT NULL,
    "estoqueMinimo" INTEGER NOT NULL,
    "status" "StatusNecessidade" NOT NULL DEFAULT 'ABERTA',
    "origem" "Origem" NOT NULL DEFAULT 'AUTOMATICA',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NecessidadeCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotacao" (
    "id" SERIAL NOT NULL,
    "necessidadeId" INTEGER NOT NULL,
    "status" "StatusCotacao" NOT NULL DEFAULT 'ABERTA',
    "criadoPorId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradaEm" TIMESTAMP(3),

    CONSTRAINT "Cotacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposta" (
    "id" SERIAL NOT NULL,
    "cotacaoId" INTEGER NOT NULL,
    "fornecedorId" INTEGER NOT NULL,
    "precoUnitario" DOUBLE PRECISION NOT NULL,
    "prazoEntregaDias" INTEGER NOT NULL,
    "quantidadeDisponivel" INTEGER NOT NULL,
    "quantidadeMinima" INTEGER NOT NULL DEFAULT 1,
    "observacao" TEXT,
    "origem" "Origem" NOT NULL DEFAULT 'MANUAL',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decisao" (
    "id" SERIAL NOT NULL,
    "cotacaoId" INTEGER NOT NULL,
    "propostaId" INTEGER NOT NULL,
    "gestorId" INTEGER NOT NULL,
    "pontuacao" DOUBLE PRECISION NOT NULL,
    "ranking" JSONB NOT NULL,
    "pesos" JSONB NOT NULL,
    "seguiuRecomendacao" BOOLEAN NOT NULL,
    "justificativa" TEXT,
    "decididoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recebidoEm" TIMESTAMP(3),
    "entregueNoPrazo" BOOLEAN,
    "avaliacao" INTEGER,

    CONSTRAINT "Decisao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoPesos" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "preco" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "prazo" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "disponibilidade" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "historico" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoPesos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sincronizacao" (
    "id" SERIAL NOT NULL,
    "origem" "Origem" NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duracaoMs" INTEGER NOT NULL,
    "sucesso" BOOLEAN NOT NULL,
    "itensLidos" INTEGER NOT NULL DEFAULT 0,
    "itensAtualizados" INTEGER NOT NULL DEFAULT 0,
    "alertasGerados" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,

    CONSTRAINT "Sincronizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" INTEGER,
    "detalhes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_sku_key" ON "Produto"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_cnpj_key" ON "Fornecedor"("cnpj");

-- CreateIndex
CREATE INDEX "NecessidadeCompra_status_idx" ON "NecessidadeCompra"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Cotacao_necessidadeId_key" ON "Cotacao"("necessidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposta_cotacaoId_fornecedorId_key" ON "Proposta"("cotacaoId", "fornecedorId");

-- CreateIndex
CREATE UNIQUE INDEX "Decisao_cotacaoId_key" ON "Decisao"("cotacaoId");

-- CreateIndex
CREATE INDEX "Log_criadoEm_idx" ON "Log"("criadoEm");

-- AddForeignKey
ALTER TABLE "NecessidadeCompra" ADD CONSTRAINT "NecessidadeCompra_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotacao" ADD CONSTRAINT "Cotacao_necessidadeId_fkey" FOREIGN KEY ("necessidadeId") REFERENCES "NecessidadeCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotacao" ADD CONSTRAINT "Cotacao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_cotacaoId_fkey" FOREIGN KEY ("cotacaoId") REFERENCES "Cotacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decisao" ADD CONSTRAINT "Decisao_cotacaoId_fkey" FOREIGN KEY ("cotacaoId") REFERENCES "Cotacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decisao" ADD CONSTRAINT "Decisao_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "Proposta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decisao" ADD CONSTRAINT "Decisao_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
