# QA-REB-001 — Estorno de saldo legado sem histórico detalhado

## Estado anterior reconfirmado
Reserva fictícia com `price=90`, `paid=20` e `payments=[]`. A interface permite estornar R$ 20 e cancelar a reserva, mas a trilha contém só o estorno: soma líquida -R$ 20 para saldo recebido zero.
Último CI anterior: 16/17 cenários aprovados, com a asserção de reconciliação falhando.
https://github.com/Dudu02170/gestao-locacao-reboques/actions/runs/44417365961
Causa: `Rules.addPayment` inicializava saldo-anterior apenas quando `payments` estava ausente, não quando era um array vazio.

## Correção proposta e critérios de aceitação
- Antes do primeiro recebimento/estorno, registrar saldo-anterior quando há valor recebido sem histórico (ausente, nulo ou vazio).
- Preservar o método anterior; quando desconhecido, indicar Não informado. Data e autor anteriores permanecem nulos, pois não são conhecidos.
- Registrar cada operação solicitada, mantendo a soma líquida da trilha igual ao valor recebido em centavos.
- Não duplicar saldo-anterior em operações seguintes nem modificar registros de um histórico já detalhado.
- Preservar os dados ao rejeitar valor/método inválido, estorno superior ao recebido ou pagamento superior ao saldo pendente.
- Manter o fluxo Selenium de estorno/cancelamento e sua asserção de reconciliação sem alterar a fixture.

## Como testar e evidência
`node --test qa/payments.test.cjs` na raiz: 7 casos da regra real. Antes da correção: 5 passaram e 2 falharam (array vazio e sequência financeira); após a correção: 7/7, sem skips.
`cd qa && npm install && npm test`: 17 cenários Selenium existentes. O resultado final do GitHub Actions deve ser conferido no PR da correção.

## Dependências e continuidade
Esta correção parte da versão atual de `qa/test-automation` (PR #1 ainda aberto). O PR #2, de conflitos e inicialização, continua independente: não altera `domain.js` e não é duplicado aqui. Revisar/integrar #1 antes de atualizar a base da correção para main.
A correção normaliza a trilha somente no próximo movimento de um saldo sem detalhamento. Não reconcilia automaticamente históricos não vazios já inconsistentes. Avaliar esses casos separadamente, com evidências e sem alterar dados reais.
Limites: regras e interface reais, com `cloud.js` simulado nos cenários autenticados. Sem Firebase, pagamento ou estorno real, autorização, upload ou concorrência real. Não existe back-end Java neste produto.
