# CompraCerta: Sistema Web de Apoio à Decisão na Gestão de Compras

Protótipo do TCC "Sistema Web de Apoio à Decisão na Gestão de Compras com Integração via API e Automação de Cotações" (Sistemas de Informação, UNESC).

O sistema consulta o estoque por uma API, identifica automaticamente os produtos abaixo do estoque mínimo, gera necessidades de compra, registra ou simula propostas de fornecedores, classifica as propostas por pontuação ponderada e entrega ao gestor um relatório para que ele tome a decisão final.

## Arquitetura

```
┌──────────────────────┐   HTTP/JSON + x-api-key   ┌──────────────────────────┐
│  API de Estoque      │ ◀──────────────────────── │  CompraCerta (Next.js)   │
│  (simulada, Express) │   GET  /api/v1/estoque    │  telas + regras + rotina │
│  porta 4000          │   POST /movimentos        │  porta 3000              │
└──────────────────────┘                           └────────────┬─────────────┘
                                                                │ Prisma ORM
                                                         ┌──────▼──────┐
                                                         │ PostgreSQL  │
                                                         └─────────────┘
```

- **web/**: Next.js 15 (React 19, TypeScript), Tailwind CSS, Recharts, Prisma ORM, PostgreSQL. Login com JWT em cookie e senhas com bcrypt.
- **api-estoque/**: API REST em Node.js/Express que representa o sistema de estoque (ERP/almoxarifado). Usa dados fictícios salvos em `data/estoque.json`.
- A rotina automática de verificação roda a cada `SYNC_INTERVALO_MIN` minutos e também pode ser executada pelo botão "Sincronizar".

## Requisitos atendidos

| Código | Requisito | Onde |
|---|---|---|
| RF01 | Cadastro de produtos | Produtos |
| RF02 | Cadastro de fornecedores | Fornecedores |
| RF03 | Estoque mínimo | Campo no cadastro de produto |
| RF04 | Consulta de estoque por API | `src/lib/estoque-api.ts`, tela Integração |
| RF05 | Identificação automática abaixo do mínimo | `src/lib/sincronizacao.ts` + `src/instrumentation.ts` |
| RF06 | Alerta de necessidade de compra | Necessidades de compra, badge no menu, dashboard |
| RF07 | Registro ou simulação de cotações | Cotação: "Registrar proposta" e "Simular propostas" |
| RF08/RF09 | Comparar e classificar propostas | `src/lib/pontuacao.ts`, tabela e gráfico da cotação |
| RF10 | Relatórios de apoio à decisão | Relatório da cotação (imprimir/PDF) e CSV do histórico |
| RF11 | Dashboard gerencial | Página inicial |
| RF12 | Histórico de cotações e decisões | Histórico e relatórios |
| RNF03 | Logs das operações | Logs |
| RNF06 | Testes com API simulada | `api-estoque/` + botão "Simular consumo" |
| Escopo | Cadastro de usuários e perfis | Usuários (Administrador, Gestor, Comprador) |

## Algoritmo de comparação

Cada critério vira uma nota de 0 a 1, normalizada pela melhor proposta da cotação:

| Critério | Nota | Peso padrão |
|---|---|---|
| Preço | menor preço ÷ preço da proposta | 40% |
| Prazo de entrega | menor prazo ÷ prazo da proposta | 30% |
| Disponibilidade | qtd. disponível ÷ qtd. necessária (máx. 1) | 20% |
| Histórico do fornecedor | nota (0 a 5) ÷ 5 | 10% |

**Pontuação = Σ nota × peso** (0 a 100). O gestor pode alterar os pesos em "Pesos do algoritmo". O sistema só recomenda: a compra é aprovada pelo gestor, que precisa justificar quando escolhe uma proposta diferente da 1ª colocada. No recebimento, a entrega é avaliada e a nota de histórico do fornecedor é recalculada (entrega atrasada perde 1 ponto), e a entrada do material é enviada para a API de estoque.

## Como rodar

### Opção 1: Docker (mais simples)

```bash
docker compose up --build
```

Acesse http://localhost:3000.

### Opção 2: local

Pré-requisitos: Node.js 20 ou superior e PostgreSQL (ou só o banco via `docker compose up banco`).

```bash
# 1. API de estoque simulada (terminal 1)
cd api-estoque
npm install
npm start

# 2. Sistema web (terminal 2)
cd web
npm install
cp .env.example .env          # ajuste DATABASE_URL se necessário
npx prisma migrate deploy     # cria as tabelas
npm run db:seed               # carrega os dados de demonstração
npm run build && npm start    # ou: npm run dev
```

### Usuários de demonstração (senha `123456`)

| E-mail | Perfil |
|---|---|
| gestor@compracerta.com | Gestor (aprova compras e altera pesos) |
| comprador@compracerta.com | Comprador (cadastros, cotações e propostas) |
| admin@compracerta.com | Administrador (tudo, inclusive usuários) |

## Roteiro de demonstração

1. Entrar como gestor. O dashboard mostra os produtos, os indicadores e o histórico já carregado.
2. Clicar em **Sincronizar estoque**: o sistema consulta a API e gera alertas para os 7 itens abaixo do mínimo.
3. Em **Necessidades de compra**, clicar em **Gerar cotação** em um item.
4. Clicar em **Simular propostas dos fornecedores** e mostrar o ranking: o menor preço nem sempre vence.
5. Abrir o **Relatório de apoio à decisão** e salvar em PDF.
6. Voltar e **Aprovar compra**. Tentar escolher outra proposta sem justificativa mostra o bloqueio.
7. **Registrar recebimento**: a nota do fornecedor muda e o estoque recebe a entrada pela API.
8. Mostrar **Histórico**, exportar o CSV e mostrar os **Logs**.
9. Em **Integração (API)**, clicar em **Simular consumo** e sincronizar de novo para gerar novos alertas.

## Testes

```bash
cd web
npm test   # testes do algoritmo de pontuação (Vitest)
```

## Estrutura

```
api-estoque/src/server.js        API REST simulada
web/prisma/schema.prisma         modelo de dados
web/prisma/seed.ts               dados de demonstração
web/src/lib/pontuacao.ts         algoritmo de comparação (+ testes)
web/src/lib/sincronizacao.ts     rotina de verificação do estoque
web/src/acoes/                   regras de negócio (server actions)
web/src/app/(sistema)/           telas
```

## Limitações (seção 6.2 do projeto)

O protótipo não realiza pagamentos, emissão de notas fiscais, integração financeira, controle contábil ou aprovação automática. O envio de solicitações aos fornecedores é simulado e os dados são fictícios.
