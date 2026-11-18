# Registros de decisões arquiteturais

Data: 18/11/2026. Status: implementadas; aderência à rubrica externa ainda não confirmada.

## ADR 001 — Preservar monólito modular

Contexto: o projeto já possuía catálogo com Repository, Service, Controller, rotas e AppError. Prazo de entrega curto.

Decisão: manter Node/Express/Knex e ampliar a mesma organização para pedidos e pagamentos. Controller traduz HTTP; Service valida e coordena regras; Repository encapsula leituras/gravações comuns. Serviços de checkout usam o objeto de transação Knex para locks e atualização coordenada de múltiplas tabelas.

Alternativas: microsserviços demandariam consistência distribuída e operação adicional; reescrita perderia trabalho validado. Consequência: implantação simples, transações fortes e algum acoplamento dos serviços de negócio ao Knex. Não existe broker ou gateway externo.

## ADR 002 — Dinheiro, estoque e idempotência persistente

Decisão: manter DECIMAL do catálogo original e registrar preços dos itens e total em centavos inteiros. Reserva ocorre em transação com locks de produtos em ordem crescente. Chaves únicas persistidas por operação e SHA-256 do corpo normalizado impedem duplicação e detectam reutilização incompatível.

Consequências: repetição retorna o estado atual do mesmo recurso, não uma cópia byte a byte da primeira resposta. Chaves não expiram. Limite de 100 itens, quantidade até 10.000 por item e total inteiro seguro. Pagamento é único por pedido; recusa encerra o pedido e exige novo pedido para nova tentativa comercial. Produto arquivado permanece referenciado no histórico.

## ADR 003 — Fila transacional no MySQL

Decisão: tabela `jobs` funciona como fila durável. Pagamento e job são inseridos na mesma transação. Worker independente usa `SKIP LOCKED`; estado do pagamento/pedido/estoque e conclusão do job são confirmados atomicamente. Savepoint desfaz efeitos parciais antes de registrar nova tentativa.

Alternativa: Redis/RabbitMQ exigiria novo serviço e outbox/coordenação entre banco e broker. Consequências: infraestrutura enxuta, polling a cada 500 ms sem trabalho, retenção de falhas e backoff de 2, 4, 8 e 16 segundos. Após quinta falha, job terminal retido. Queda antes do commit libera locks e permite reprocessamento; efeitos são idempotentes. A implementação não promete entrega exatamente uma vez em integrações externas: não há integração externa nesta simulação.

## ADR 004 — Cache local e feature flags

Decisão: cache de listagem por consulta/página, TTL 5 s, máximo 500 chaves. Clone de entradas evita mutação acidental. Novas escritas locais limpam o cache. Estoque autoritativo e preço do checkout vêm sempre do banco. Flags por ambiente para cache e pagamentos.

Consequências: cache não compartilhado, consistência eventual entre API e worker/réplicas. A escolha é explícita e precisa ser revista caso a rubrica exija Redis ou invalidação distribuída. Flags exigem reinício do processo para alterações no arquivo de ambiente.

## ADR 005 — Dados e testes preservados

Decisão: migrations incrementais, sem alteração da migration original; arquivamento lógico; seeds aditivos; testes exclusivamente em `marketplace_test`, sem truncate. Manter os sete testes originais e adicionar regressões de concorrência, contratos e fila. Não executar rollback/down com remoção de volume.

Consequências: banco de testes acumula fixtures identificáveis, mas não apaga dados do usuário. CI e Compose de testes usam base isolada. O contrato OpenAPI 3.1 é verificado por Ajv nos testes HTTP; isso valida schemas e respostas cobertas, não é uma certificação completa de todos os aspectos da especificação OpenAPI.
