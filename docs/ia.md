# Uso de IA e prompts

Este documento complementa e preserva [o registro anterior](uso-ia.md).
A IA foi usada como apoio ao desenvolvimento; não há chatbot ou funcionalidade de IA no Marketplace.

## Prompts disponíveis nesta revisão

Prompt do usuário, transcrito nos trechos relevantes:

> Revise o Marketplace que você acabou de implementar. Uma auditoria independente encontrou pendências em relação ao Projeto A do professor.

> Corrija as pendências abaixo sem recomeçar o projeto:

1. Corrija os scripts npm para que `npm test` e `npm run test:coverage` funcionem no Windows com `NODE_ENV=test` e utilizem exclusivamente `marketplace_test`.
2. Crie `.env.example` sem credenciais reais, com todas as variáveis necessárias.
3. Crie `CONTRIBUTORS.md` e `docs/ia.md`. Aproveite `docs/uso-ia.md`, incluindo os prompts relevantes utilizados no desenvolvimento.
4. O professor exige pelo menos 100 mil pedidos sintéticos. Otimize o seed para evitar uma única transação enorme e muitas consultas individuais. Preserve a idempotência e os dados existentes. Prepare a execução segura em banco separado e verifique as contagens.
5. Acrescente SCA de dependências e lint OpenAPI ao GitHub Actions.
6. Complete a observabilidade com evidência de pelo menos um trace e um SLO explicitamente declarado.
7. Execute, quando possível, os testes k6 em três estágios e produza a comparação real de desempenho antes/depois. Não invente medições.
8. Valide o funcionamento do Docker Compose, dos testes, da cobertura e do pipeline.
9. Revise o README com os comandos reais de instalação, configuração, inicialização e teste.

> Não apague bancos ou volumes, não execute operações destrutivas, não publique sem minha autorização e não exponha credenciais.

Os prompts das etapas anteriores não estão disponíveis no histórico acessível desta revisão. O arquivo uso-ia.md registra as intervenções anteriores, mas não transcrições desses prompts; não foram reconstruídas citações fictícias.

## Alterações e revisão humana

Executor de testes portável; seed em lotes com bloqueio, retomada e inserções coletivas; ambientes de exemplo; checks de dependências e contrato na CI; spans JSON HTTP/MySQL e histogramas; SLO; documentação e evidências locais.
A responsabilidade humana inclui conferir os nomes dos integrantes, entender as transações, revisar a rubrica e concluir as execuções bloqueadas pelo ambiente.
As medições e limitações estão em [verificacao.md](verificacao.md), [desempenho.md](desempenho.md) e [observabilidade.md](observabilidade.md).

