# Defeito reproduzido pela automação

## QA-REB-001 — Estorno de saldo legado não registra o saldo anterior

Condição: reserva fictícia com `price=90`, `paid=20` e `payments=[]`. O saldo recebido existe, mas ainda não há detalhamento de pagamentos.

Reprodução: `cd qa && npm test` com Node.js 22+, Chrome e ChromeDriver. No cenário de reserva paga, a interface bloqueia o cancelamento antes do estorno. Registrar estorno de R$ 20 com motivo e confirmação; em seguida cancelar a reserva com motivo.

Esperado: saldo recebido zero e trilha reconciliável, com saldo-anterior de R$ 20 e estorno de R$ 20.
Obtido: saldo recebido zero, mas a trilha contém apenas o estorno de R$ 20; sua soma líquida é -R$ 20. A reserva pode ser cancelada, preservando a trilha incompleta.

Causa observada em domain.js: Rules.addPayment cria o registro saldo-anterior somente quando `payments` está ausente. Um array vazio é verdadeiro em JavaScript e não entra nessa inicialização, mesmo com valor recebido positivo.

Evidência inicial em Selenium: https://github.com/Dudu02170/gestao-locacao-reboques/actions/runs/44397733383
A reprodução isolada da regra real também produziu `paid=0` e soma líquida da trilha=-20.

O cenário verifica o cancelamento e a preservação dos dados antes da asserção final de reconciliação. A expectativa financeira permanece ativa e mantém a suíte vermelha enquanto o defeito existir. Não foi acrescentado saldo anterior artificialmente à fixture.

Limites: interface e regras reais com persistência cloud.js simulada e dados fictícios. Não houve pagamento, estorno ou integração Firebase real. O código da aplicação permanece intacto.
