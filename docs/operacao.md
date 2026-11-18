# Operação

## Configuração e diagnóstico

API: `npm start`; worker: `npm run worker`. `/health` mostra processo vivo, `/ready` confirma conexão ao MySQL. `/metrics` exporta contagem e soma/contagem da duração das requisições por método, rota parametrizada e status. Os contadores reiniciam com o processo; não há histogramas nem tracing distribuído nesta versão.

Logs JSON contêm `timestamp`, evento e campos operacionais; requisições recebem `X-Request-Id`. Erros internos não incluem SQL, stack ou credenciais na resposta/log. Para identificar falha no worker, correlacione `queue_job.id` com a tabela `jobs`; detalhes sensíveis não são registrados.

## Fila e falhas

Diagnóstico somente leitura:

```sql
SELECT status, COUNT(*) AS total FROM jobs GROUP BY status;
SELECT id, pagamento_id, tentativas, disponivel_em FROM jobs WHERE status = 'falhou';
```

Após corrigir a causa, um operador pode reabrir **um ID específico** com `UPDATE jobs SET status='pendente', tentativas=0, disponivel_em=CURRENT_TIMESTAMP WHERE id=<ID_VERIFICADO> AND status='falhou'`. Não é executado automaticamente. Jobs concluídos e pagamentos finais são protegidos contra efeitos repetidos. Não apague filas ou históricos para recuperar o processamento.

Se pagamentos estiverem desativados, novos pagamentos retornam 503; jobs já aceitos continuam. Reservas sem pagamento não expiram automaticamente. Não há estorno financeiro real; recusa da simulação cancela e restitui estoque.

## Preservação e mudanças de schema

Migrations novas acrescentam tabelas, coluna `ativo` e índices. A migration original foi preservada. `npm run migrate` aplica somente pendentes. Não foi executado rollback ou remoção do volume de desenvolvimento. Para implantação em dados importantes, mantenha backup por procedimento próprio antes de migrations.

O usuário do MySQL de testes deve ter acesso a `marketplace_test` e permissão de DDL para migrations. O serviço Docker `test-db` já cria esse usuário; bases existentes não são alteradas automaticamente pelo Compose. `.env.test` não é copiado para imagens nem versionado. Variáveis externas têm precedência sobre dotenv; a proteção rejeita nome de banco diferente de `marketplace_test` em `NODE_ENV=test`.
