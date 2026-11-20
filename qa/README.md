# Regressão de locações
JavaScript, Selenium, Chrome e Node.js 22+.
```sh
cd qa
npm install
npm test
```
Dezessete cenários Selenium: bloqueio sem configuração Firebase (cloud.js real), busca por placa, contatos duplicados, reserva com snapshots, limites e sobreposição de intervalos, pagamento, limite de saldo, falha de persistência, estorno antes do cancelamento e reconciliação da trilha financeira.
Nas rotas normais, o servidor substitui apenas cloud.js por persistência em memória com cliente/veículo/reserva fictícios; app.js, domain.js, management.js e telas são reais. Não modifica arquivos da aplicação.
O modo ?qaMode=locked usa o cloud.js original sem configuração Firebase. Nenhum dado real é usado.
Limites: a sessão do cenário simulado não testa autenticação/autorização do Firebase nem concorrência real ou upload. Testes de integração desses serviços ficam para um ambiente Firebase Emulator.
JUnit e evidências nas falhas em reports/. CI automática em PR.

## Regressão de pagamentos
`node --test qa/payments.test.cjs` a partir da raiz executa sete testes da regra real de `domain.js`, sem navegador ou Firebase. Cobre histórico ausente/nulo/vazio, saldo zero, recebimentos e estornos sucessivos, preservação da trilha detalhada e rejeições sem alterar dados.

QA-REB-001: no primeiro movimento de um saldo legado com histórico vazio, a regra registra o saldo anterior uma vez, sem inventar data ou autor, e então acrescenta o recebimento/estorno solicitado. Não reescreve um histórico já detalhado.

No CI, as regras e o Selenium são executados em etapas distintas. Relatórios em `reports/payments.xml` e `reports/results.xml`; a aprovação local de regras não substitui a validação de interface.
