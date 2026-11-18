# Verificação da revisão — 18/11/2026

Esta revisão substitui o estado anterior de verificação. Evidências executadas no Windows, Node 22.17.0/npm 10.9.2 e MySQL local. Não houve publicação, remoção de bancos ou remoção de volumes.

## Requisitos concluídos

- Executor Node portável força NODE_ENV=test e marketplace_test; cobertura tem argumento explícito, sem depender de encaminhamento de flags pelo PowerShell.
- .env.example revisado, mais .env.test.example e .env.benchmark.example; nenhuma senha real nos exemplos. Arquivos locais de credenciais preservados.
- CONTRIBUTORS.md e docs/ia.md criados; registro anterior de uso de IA preservado e referenciado; prompt disponível registrado sem inventar histórico.
- Seed em lotes, lock compartilhado por lote, operações coletivas, retomada e preservação de chaves anteriores. Execução restringida a bases de teste/benchmark.
- Perfil Compose benchmark com volume e porta próprios; preparação não requer tocar no volume de desenvolvimento.
- SCA npm audit e lint OpenAPI Redocly adicionados ao GitHub Actions; nenhuma publicação/deploy.
- Trace HTTP/MySQL real, correlação traceparent, histogramas e SLO explícito.
- Catálogo e checkout k6 em três estágios; executor de comparação cache desligado/ligado com três repetições e summaries reais quando k6 estiver disponível.
- README revisado com instalação, ambientes, inicialização, migrações, testes, seed e operação.

## Testes e verificações executados

| Verificação | Resultado |
| --- | --- |
| npm test após correção inicial | 39 testes, 7 suítes aprovados |
| npm test com DB_NAME=marketplace_db herdado do shell | 42 testes, 9 suítes aprovados; executor manteve marketplace_test |
| npm run test:unit | 25 testes, 4 suítes aprovados |
| npm run test:coverage após instrumentação/testes novos | 42 testes, 9 suítes aprovados |
| Cobertura | 95,91% statements; 90,50% branches; 100% funções; 98,16% linhas |
| ESLint | Aprovado após ajustes |
| Seed 100 mil + repetição | Aprovados, em marketplace_test |
| Trace via HTTP e consulta MySQL reais | Aprovado; vínculo pai/filho verificado |
| npm ls --depth=0 | Dependências diretas consistentes |
| Compose config com perfis test/benchmark | Aprovado; aviso de permissão no config do cliente Docker |
| YAML do workflow | Parseado; etapas locais inspecionadas |
| npm run audit:dependencies | Tentado; endpoint npm inacessível, sem conclusão de vulnerabilidades |
| npm run lint:openapi | Tentado; download da CLI bloqueado por EACCES |
| npm run perf:compare | Tentado; k6 ausente, nenhuma medição gerada |
| Docker engine | Acesso ao named pipe negado; containers não verificados |
| CI no GitHub | Não executada; pasta sem .git e sem autorização de publicação |

Os testes de contrato Ajv/Supertest passaram, mas isso não equivale a uma execução completa do Redocly. Validação YAML/Compose não equivale a execução remota do pipeline ou inicialização de containers. npm ci não foi reexecutado neste ambiente sem acesso ao registry; os testes usaram as dependências já instaladas.

## Resultados comprovados

[evidence/seed.json](evidence/seed.json) registra:
- Antes: 65 produtos totais, 49 pedidos, 49 itens, 31 pagamentos; 3 pedidos sintéticos.
- Depois: 1.062 produtos totais, 100.046 pedidos, 100.046 itens e 100.028 pagamentos.
- Dentro desses totais: **1.000 produtos, 100.000 pedidos, 100.000 itens e 100.000 pagamentos sintéticos**.
- Repetição: mesmas contagens e estoque sintético agregado de 9.900.000.
- Tempo da primeira execução: 30.497,7893 ms; repetição: 2.238,7855 ms. Não é uma comparação de desempenho do algoritmo antigo/novo nem da API.

[evidence/trace.json](evidence/trace.json): trace e852ddc382eceb7a7d714c2c3643f0b4, SERVER GET /ready (200, 40,03 ms) e filho CLIENT mysql.readiness (34,61 ms). Consulta real em marketplace_test. Esses tempos são de uma única requisição; não demonstram o SLO.

As fixtures de integração são aditivas. O teste do seed verifica a preservação de um produto anterior. Dados de desenvolvimento não receberam seed nesta revisão.

Consulta final somente de leitura em marketplace_db: 1.002 produtos e 1.000 pedidos sintéticos, consistentes com o estado anterior. Resumo de validação e cobertura: [evidence/validation.json](evidence/validation.json).

## Pendências dependentes do ambiente/usuário

1. Preencher nome(s), matrícula(s) e responsabilidades em CONTRIBUTORS.md.
2. Disponibilizar o enunciado caso a página continue inacessível, para conferência integral dos requisitos além da lista da auditoria.
3. Executar Compose com acesso ao Docker engine. Perfil benchmark já preparado; os usuários MySQL atuais não têm permissão para criar marketplace_benchmark. Os 100 mil pedidos foram comprovados na base separada marketplace_test.
4. Disponibilizar k6 e a base benchmark para executar a comparação real e checkout. Ver docs/desempenho.md; não há resultados k6 neste ambiente.
5. Permitir acesso ao registry npm para concluir npm ci, SCA e Redocly. Não se afirma ausência de vulnerabilidades.
6. Após revisão e autorização de publicação, executar o workflow no GitHub. Nenhuma ação remota foi disparada.

O SLO exige histórico de observação para demonstrar cumprimento. Há exportação local de spans, sem coletor OpenTelemetry ou rastreamento entre API/fila/worker; essa limitação está explícita em observabilidade.md.

