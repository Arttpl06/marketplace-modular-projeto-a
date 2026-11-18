# Projeto A — Marketplace Modular

API acadêmica Node.js 22, Express, Knex e MySQL 8.4, com catálogo, pedidos e pagamentos simulados. Mantém Repository → Service → Controller → Routes. Não há chatbot ou IA no produto.

## Instalação e configuração (PowerShell)

Requisitos: Node.js 22/npm, MySQL 8.4 ou Docker Compose. k6 é necessário apenas para carga. Preserve seus arquivos locais de ambiente.

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path .env.test)) { Copy-Item .env.test.example .env.test }
```

Preencha senhas localmente; exemplos não contêm credenciais. .env usa marketplace_db na porta 3308; .env.test deve usar exclusivamente marketplace_test com usuário autorizado apenas nessa base. O DBA deve provisionar a base de testes se ela não existir. Não utilize root na aplicação. .env.example contém conexão, porta, flags, credenciais para os perfis Compose e parâmetros de seed/k6. UNIT_ONLY é interno ao executor de testes.

Para MySQL já disponível:

```powershell
npm run migrate
npm start
```

Em outro terminal: `npm run worker`. Sem worker, pagamentos permanecem pendentes.
Health: http://localhost:3000/health; readiness: http://localhost:3000/ready.

## Docker Compose

Preencha DB_PASSWORD e MYSQL_ROOT_PASSWORD em .env antes de inicializar um volume novo.

```powershell
docker compose config --quiet
docker compose up --build -d db migrate app worker
docker compose ps
docker compose logs app worker
```

Migrations precedem API/worker. O volume mysql_data existente é preservado. Alterar .env não altera as credenciais de um volume já inicializado. Portas limitadas a 127.0.0.1. Não remova bancos ou volumes.

Perfil de testes isolado, após preencher TEST_DB_PASSWORD em .env:

```powershell
docker compose --profile test up --build --abort-on-container-exit --exit-code-from tests tests
```

test-db usa marketplace_test em tmpfs, sem acesso ao volume de desenvolvimento. O comando executa cobertura. Validação de configuração passou localmente; inicialização de containers não pôde ser verificada por falta de acesso ao engine.

## Testes e qualidade

```powershell
npm test
npm run test:unit
npm run test:coverage
npm run lint
npm run lint:openapi
npm run audit:dependencies
```

Os executores Node forçam NODE_ENV=test e DB_NAME=marketplace_test antes de carregar configuração, inclusive quando o shell herda DB_NAME de desenvolvimento. Não dependem da sintaxe POSIX de variáveis. .env.test fornece a conexão; variáveis de conexão exportadas pelo shell têm precedência. A validação da configuração recusa outro nome de banco em modo de teste.

Jest executa migrations e acrescenta fixtures; não trunca tabelas. Limites: 80% statements/linhas/funções e 70% branches. Cobertura exclui entrypoints/configuração e é salva em coverage/. Integração e contrato usam MySQL real.

GitHub Actions: npm ci, ESLint, Redocly OpenAPI (CLI fixada em 1.34.5), SCA com npm audit (bloqueia vulnerabilidades high/critical), validação Compose, testes e cobertura. Não faz deploy. O contrato foi testado com Ajv/Supertest; o lint completo Redocly e o SCA exigem rede e não puderam concluir localmente. CI remota ainda não executada; esta pasta não contém .git.

## Seed seguro: pelo menos 100 mil pedidos

O seed só aceita marketplace_test ou marketplace_benchmark. Recusa marketplace_db. Não apaga nem recria dados existentes. Usa transações de até 500 pedidos, inserções coletivas e atualização agregada de estoque; um lock por lote serializa seeds concorrentes. Lote com erro é revertido; lotes já confirmados permitem retomada. SEED_BATCH_SIZE admite 1–1000; SEED_PRODUCTS/SEED_ORDERS admitem 0–1.000.000 (pedidos exigem produtos).

Padrão: 1.000 produtos e 100.000 pedidos/itens/pagamentos sintéticos. Identificadores synthetic:v1 e synthetic-v1 preservam compatibilidade com dados anteriores. Não há INSERT IGNORE nem atualização de pedidos preexistentes. Estoque é reservado apenas para pedidos novos. Produtos existentes conservam preço e outros atributos; seu estoque diminui somente pelas novas reservas.

Para benchmark dedicado, preencha BENCHMARK_DB_PASSWORD em .env e a mesma senha em .env.benchmark:

```powershell
if (!(Test-Path .env.benchmark)) { Copy-Item .env.benchmark.example .env.benchmark }
docker compose --profile benchmark up -d benchmark-db
npm run seed:verify
```

O perfil cria banco/usuário marketplace_benchmark na porta 3309 em volume separado benchmark_data. Aguarde ficar healthy antes de executar seed:verify. Com MySQL externo, peça ao DBA a base e o usuário dedicados e ajuste a conexão; o script não cria bancos nem concede privilégios.

Alternativa já executada nesta revisão, usando a base de testes existente e separada de desenvolvimento:

```powershell
npm run seed:verify:test
```

Ambos aplicam migrations, capturam contagens, executam o seed duas vezes e verificam idempotência, estoque agregado e contagens de itens/pagamentos. Salvam docs/evidence/seed.json; novas execuções substituem essa evidência, não os dados. Não execute testes/carga simultaneamente à captura das contagens.

`npm run seed` continua disponível para uma conexão já configurada para um dos bancos permitidos. No .env padrão de desenvolvimento ele recusa executar por segurança.

## API e demonstração

Contrato: [OpenAPI 3.1](docs/openapi.json). Demonstração nativa PowerShell:

```powershell
$p = Invoke-RestMethod -Method Post http://localhost:3000/produtos -ContentType 'application/json' -Body '{"nome":"Teclado","preco":99.90,"estoque":10}'
$key = [guid]::NewGuid().ToString()
$body = @{ itens = @(@{ produto_id = $p.id; quantidade = 2 }) } | ConvertTo-Json -Depth 4
$o = Invoke-RestMethod -Method Post http://localhost:3000/pedidos -ContentType 'application/json' -Headers @{ 'Idempotency-Key' = $key } -Body $body
$payment = @{ pedido_id = $o.id; resultado = 'aprovado' } | ConvertTo-Json
Invoke-RestMethod -Method Post http://localhost:3000/pagamentos -ContentType 'application/json' -Headers @{ 'Idempotency-Key' = "payment-$key" } -Body $payment
Invoke-RestMethod "http://localhost:3000/pedidos/$($o.id)"
```

Aguarde o worker para a conclusão. Repita chave/corpo para demonstrar idempotência; mudar corpo com a mesma chave retorna 409. Use resultado recusado em um novo pedido para demonstrar devolução de estoque.

| Rota | Comportamento |
| --- | --- |
| GET /produtos | Busca q, paginação page/limit (máximo 100), cache 5 segundos |
| POST /produtos | Cadastro validado |
| GET/PATCH/DELETE /produtos/:id | Consulta, edição e arquivamento lógico |
| POST /pedidos | Reserva transacional; exige Idempotency-Key |
| GET /pedidos/:id | Pedido e preços históricos |
| POST /pagamentos | Simulação assíncrona, retorna 202; exige Idempotency-Key |
| GET /pagamentos/:id | Consulta do processamento |
| GET /health, /ready, /metrics | Saúde, MySQL e métricas Prometheus |

Preços de catálogo em reais; pedidos/itens em centavos inteiros. PAYMENTS_ENABLED=false bloqueia novas solicitações; replays continuam consultáveis. CATALOG_CACHE_ENABLED=false desliga cache. Reinicie a API ao alterar flags. O cache é local por processo, limitado a 500 entradas; checkout sempre verifica estoque no banco. Fila MySQL usa SKIP LOCKED, cinco tentativas e backoff; consulte [operação](docs/operacao.md).

## Observabilidade e desempenho

```powershell
npm run trace:evidence
npm run perf:compare
```

trace:evidence usa .env.test e grava um trace HTTP → MySQL real. [SLO declarado](docs/observabilidade.md): 99% de disponibilidade e 95% das respostas até 500 ms, janela móvel de 30 dias nas rotas de negócio. São metas, não cumprimento já comprovado. Logs JSON não incluem senhas, corpos ou cabeçalhos sensíveis.

perf:compare exige k6, .env.benchmark e seed de 100 mil pedidos. Executa catálogo em três estágios, três rodadas com cache desligado e três com cache ligado; grava summaries e comparação. Para checkout, inicie API/worker dedicados em terminais novos:

```powershell
node --env-file=.env.benchmark src/server.js
# Outro terminal:
node --env-file=.env.benchmark src/worker.js
```

Não mantenha variáveis DB_* exportadas de outro ambiente nesses terminais. Comandos de carga e limitações: [desempenho](docs/desempenho.md). Nenhuma medição k6 foi inventada.

## Entrega e limites

[Evidências e pendências](docs/verificacao.md), [contribuidores](CONTRIBUTORS.md), [IA e prompts](docs/ia.md), [registro anterior de IA](docs/uso-ia.md), [ADRs](docs/adr.md), [C4](docs/c4.md).

API acadêmica local: sem autenticação, frontend, cobrança externa, expiração de reservas ou tracing distribuído da fila. Nenhuma publicação foi feita. A URL do professor não pôde ser recuperada; as correções seguem as pendências explícitas da auditoria, sem alegar conformidade integral com texto inacessível.

