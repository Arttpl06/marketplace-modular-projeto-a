# Observabilidade e SLO

## SLO declarado

Em uma janela móvel de **30 dias**, para as rotas /produtos, /pedidos e /pagamentos:
- Disponibilidade: **99%** das respostas HTTP devem ter status inferior a 500.
- Latência: **95%** das respostas devem terminar em **até 500 ms**.
- Orçamento de erro de disponibilidade: 1% das requisições elegíveis no período.

Esses objetivos são decisões deste projeto; não são resultados medidos por 30 dias nem valores atribuídos à rubrica inacessível.
Respostas 4xx entram no denominador e contam como disponíveis; falhas sem resposta HTTP precisam de sondagem externa e não aparecem neste SLI.
Health, readiness e metrics ficam fora do SLO de negócio.

SLIs PromQL para um coletor Prometheus configurado com scrape de /metrics:

```promql
1 - sum(increase(http_requests_total{route=~"/(produtos|pedidos|pagamentos).*",status=~"5.."}[30d]))
  / sum(increase(http_requests_total{route=~"/(produtos|pedidos|pagamentos).*"}[30d]))

sum(increase(http_request_duration_seconds_bucket{route=~"/(produtos|pedidos|pagamentos).*",le="0.5"}[30d]))
  / sum(increase(http_request_duration_seconds_count{route=~"/(produtos|pedidos|pagamentos).*"}[30d]))
```

Quando não houver séries 5xx, considerar o numerador zero; sem tráfego, o SLI é indefinido. Não há coletor persistente provisionado nesta entrega; o endpoint reinicia os contadores ao reiniciar o processo.

## Trace comprovável

`npm run trace:evidence` usa .env.test e faz GET /ready via HTTP local. Verifica status 200 e a relação entre o span SERVER e o span CLIENT mysql.readiness, que executa SELECT 1 de verdade. Grava [evidence/trace.json](evidence/trace.json), sem credenciais, SQL ou corpos.

Instrumentação leve com AsyncLocalStorage; IDs de trace de 128 bits e spans de 64 bits; traceparent de entrada validado; logs correlacionados por trace_id/request_id. Cada requisição produz um span SERVER e readiness produz um filho MySQL. Exportação em JSON local, sem coletor OpenTelemetry, dashboard ou tracing da fila entre processos. A duração registrada é a medição real em milissegundos; timestamp é o instante de conclusão.

