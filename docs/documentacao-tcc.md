# Provisa · Documentação técnica para o TCC

Material de apoio para o artigo e para a apresentação à banca: diagramas, rastreabilidade dos
requisitos do projeto, funcionalidades acrescentadas na implementação e como os testes validam o sistema.

## 1. Diagramas

| Diagrama | Arquivo |
|---|---|
| Casos de uso | [diagramas/01-casos-de-uso.png](diagramas/01-casos-de-uso.png) |
| Fluxo do processo de compra | [diagramas/02-fluxo-do-processo.png](diagramas/02-fluxo-do-processo.png) |
| Sequência (estoque → cotação → pagamento → recebimento) | [diagramas/03-sequencia.png](diagramas/03-sequencia.png) |
| Modelo de dados (entidade-relacionamento) | [diagramas/04-modelo-de-dados.png](diagramas/04-modelo-de-dados.png) |
| Arquitetura | [diagramas/05-arquitetura.png](diagramas/05-arquitetura.png) |

Os arquivos `.mmd` ao lado de cada imagem são o código-fonte em Mermaid (podem ser editados em https://mermaid.live).

## 2. Rastreabilidade dos requisitos funcionais

| Código | Requisito (projeto) | Onde está no sistema | Código principal |
|---|---|---|---|
| RF01 | Cadastro de produtos | Produtos | `app/(sistema)/produtos`, `acoes/cadastros.ts` |
| RF02 | Cadastro de fornecedores | Fornecedores (inclui dados para pagamento) | `app/(sistema)/fornecedores`, `components/FormFornecedor.tsx` |
| RF03 | Configuração de estoque mínimo | Produtos (estoque mínimo e quantidade de reposição) | `components/FormProduto.tsx` |
| RF04 | Consulta de estoque por API real ou simulada | Integração (API), botão Verificar estoque | `lib/estoque-api.ts`, `api-estoque/` |
| RF05 | Identificar produtos abaixo do mínimo | Rotina automática e sincronização manual | `lib/sincronizacao.ts`, `instrumentation-node.ts` |
| RF06 | Gerar alerta de necessidade de compra | Necessidades de compra (agrupadas por categoria) | `app/(sistema)/necessidades` |
| RF07 | Registro ou simulação de cotações | Cotação por categoria, e-mail ao fornecedor, portal de resposta, registro manual e simulação | `lib/solicitacoes.ts`, `app/responder/[token]`, `lib/simulacao.ts` |
| RF08 | Comparar propostas | Comparativo e matriz de preço por item | `app/(sistema)/cotacoes/[id]` |
| RF09 | Classificar por preço, prazo, disponibilidade e histórico | Ranking com pontuação ponderada e alertas | `lib/pontuacao.ts` |
| RF10 | Relatórios de apoio à decisão | Relatório imprimível (PDF) e CSV de decisões | `cotacoes/[id]/relatorio`, `api/relatorios/decisoes` |
| RF11 | Dashboard gerencial | Dashboard com filtro por setor | `app/(sistema)/page.tsx`, `lib/indicadores.ts` |
| RF12 | Histórico de cotações e decisões | Histórico e relatórios; decisão guarda ranking e pesos | `app/(sistema)/historico` |

### Funcionalidades acrescentadas na implementação

| Código | Funcionalidade | Motivo |
|---|---|---|
| RF13 | Envio automático do pedido de cotação por e-mail, com link exclusivo por fornecedor | Eliminar a etapa manual de contatar cada fornecedor |
| RF14 | Portal do fornecedor: preço por item, prazo, forma de pagamento, "Não tenho" por item ou para todos | O próprio fornecedor registra a proposta, sem redigitação |
| RF15 | Cotação única por categoria (vários itens) | Reflete como o hospital compra na prática |
| RF16 | Quantidade definida pelo comprador (o sistema só sugere) na necessidade, na cotação e na aprovação | A decisão de quanto comprar é humana |
| RF17 | Pedido de compra por e-mail e imprimível; aviso aos fornecedores não escolhidos | Fechar o ciclo da compra |
| RF18 | Resumo da compra ao comprador com valor, forma de pagamento, vencimento e dados para pagamento; registro do pagamento libera a entrega | Integrar o pagamento ao processo |
| RF19 | Lembrete automático ao fornecedor que não respondeu (12 h antes do prazo) e aviso ao comprador quando a cotação está pronta | Reduzir a cobrança manual de respostas |
| RF20 | Simulação de pesos ("e se?") na cotação | Análise de sensibilidade da recomendação |
| RF21 | Página de Avaliação organizada pelas hipóteses H1 a H4 | Validação da proposta (seção 5 do projeto) |
| RF22 | Perfis de acesso: comprador decide; gestor e administrador configuram pesos e automação | Separação de responsabilidades |

## 3. Requisitos não funcionais

| Código | Requisito | Como foi atendido |
|---|---|---|
| RNF01 | Interface web simples e objetiva | Next.js + Tailwind, layout responsivo, ações principais em um clique |
| RNF02 | Integridade e consistência dos dados | PostgreSQL com chaves estrangeiras e restrições únicas, transações nas operações compostas, validação no servidor |
| RNF03 | Logs das operações principais | Tabela de log (usuário, ação, entidade, data) e tela Logs |
| RNF04 | Manutenção e evolução | TypeScript, regras isoladas em `lib/`, migrações versionadas do banco (Prisma) |
| RNF05 | Informações claras ao gestor | Ranking com alertas, gráfico de composição da pontuação, relatório e dashboard |
| RNF06 | Testes com API simulada | API de estoque em Express com dados fictícios do hospital e simulação de consumo |
| RNF07 | Relatórios e tabelas comparativas | Comparativo, matriz de preços por item, relatório PDF e exportação CSV |

Segurança: senhas com hash bcrypt, sessão em cookie assinado (JWT) e conferida no banco a cada acesso, chave de API para a integração de estoque e link de resposta do fornecedor com token aleatório de 192 bits.

## 4. Algoritmo de pontuação

Cada critério recebe uma nota de 0 a 1 e a pontuação final é a soma ponderada (0 a 100):

- **Preço** = custo dos itens cotados pelo menor preço de cada item ÷ custo da proposta
- **Prazo** = menor prazo da cotação ÷ prazo da proposta
- **Disponibilidade** = média por item de mín(1, disponível ÷ necessário); item não cotado vale 0
- **Histórico** = nota do fornecedor ÷ 5

Pesos padrão: preço 40%, prazo 30%, disponibilidade 20%, histórico 10% (configuráveis pelo gestor).
Com um único item as fórmulas são as do projeto original. Empates são decididos pelo menor valor total e depois pelo menor prazo.

**Ponto para a banca:** uma proposta que cota só parte dos itens não é penalizada no preço (compara-se item a item), mas perde em disponibilidade. Por isso, quando o preço tem peso muito alto, uma proposta parcial pode ficar em 1º lugar; a simulação de pesos mostra esse efeito e o comprador decide, com os itens não atendidos voltando para uma nova cotação.

## 5. Testes automatizados

`npm test` executa 23 testes (Vitest):

- **pontuacao.test.ts (14):** pontuação máxima, prazo e histórico além do preço, pesos padrão, troca e normalização dos pesos, quantidade mínima, lista vazia, custo do pedido com vários itens, item não cotado, quantidade sugerida, nota de entrega atrasada e análise de sensibilidade (a recomendação muda com a prioridade, a escala dos pesos não altera o resultado, a soma das contribuições é a pontuação).
- **propostas.test.ts (5):** leitura da resposta do fornecedor (preço com vírgula, "Não tenho", nenhum item, preço inválido).
- **pagamento.test.ts (3):** formas de pagamento e cálculo do vencimento.
- **simulacao.test.ts (1):** propostas simuladas válidas.

O fluxo completo (estoque → cotação → resposta do fornecedor → ranking → aprovação → pedido → pagamento → recebimento → e-mails → avaliação) foi testado ponta a ponta no navegador durante o desenvolvimento.
