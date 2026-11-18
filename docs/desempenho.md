# Desempenho: execução e limites

## Estado comprovado em 18/11/2026

**k6 não está instalado**. O acesso de rede para obter ferramentas/dependências está bloqueado e o Docker engine também está inacessível. Não há p50/p95, vazão ou taxa de erros medidos por k6 nesta revisão, nem ganho antes/depois comprovado.

| Comparação da API | p50 | p95 | req/s | erros |
| --- | --- | --- | --- | --- |
| Antes: cache desligado | Não medido | Não medido | Não medido | Não medido |
| Depois: cache ligado | Não medido | Não medido | Não medido | Não medido |

Não confundir testes Jest, trace de uma requisição ou tempo de seed com teste de carga.

## Procedimento reproduzível

1. Instale k6 e confirme `k6 version`. Opcionalmente defina K6_BIN com o caminho do executável.
2. Configure .env.benchmark, inicie o banco dedicado e execute `npm run seed:verify` conforme README.
3. Deixe a porta 3001 disponível e execute `npm run perf:compare`.
4. O executor inicia e encerra apenas os processos de API que ele próprio criou. Usa exclusivamente marketplace_benchmark, confere pelo menos 100 mil pedidos sintéticos e faz três rodadas de cada configuração. Alterna a ordem, reinicia a API e aquece as dez páginas antes de cada rodada.
5. Compare as medianas de p50, p95, req/s e erros em performance-results/<data>/comparison.json; preserve os seis summaries. Exit code diferente de zero indica falha/threshold não atendido, inclusive se o arquivo de summary existir.

Catálogo: três estágios de 15s/30s/15s com alvos 10/30/0 VUs; p95 < 500 ms, falhas < 1%, checks > 99%. Esta comparação mede o efeito da flag de cache sobre a mesma versão do código e os mesmos dados, não versões históricas do projeto.

Checkout também tem três estágios: 15s/30s/15s, alvos 5/10/0 VUs, p95 < 1000 ms. Com API e worker apontados para .env.benchmark:

```powershell
New-Item -ItemType Directory -Force performance-results
k6 run --summary-export=performance-results/checkout.json -e BASE_URL=http://localhost:3001 tests/performance/checkout.js
```

Checkout acrescenta produto, pedidos, pagamentos e jobs à base dedicada; não remove registros. A recusa simulada devolve estoque quando o worker processa. O tempo HTTP mede aceitação, não conclusão assíncrona. Anote backlog antes/depois (`SELECT status, COUNT(*) FROM jobs GROUP BY status`), CPU/RAM, SO, MySQL, k6 e versão do código junto aos resultados.

## Medição real do seed

[evidence/seed.json](evidence/seed.json): 100.000 pedidos sintéticos em marketplace_test, lote 500. Primeira execução desta revisão: **30,50 s**; repetição idempotente: **2,24 s**. Eram 3 pedidos sintéticos antes; foram acrescentados 99.997.
A repetição não é um benchmark do algoritmo antigo versus o novo, porque não insere os mesmos dados. Não foi preservada uma medição comparável do seed antigo.

