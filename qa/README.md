# Regressão de locações
JavaScript, Selenium, Chrome e Node.js 22+.
```sh
cd qa
npm install
npm test
```
Oito cenários: bloqueio sem configuração Firebase (cloud.js real), busca por placa, contatos duplicados, reserva com snapshots, sobreposição de reservas, pagamento, limite de saldo e falha de persistência.
Nas rotas normais, o servidor substitui apenas cloud.js por persistência em memória com cliente/veículo/reserva fictícios; app.js, domain.js, management.js e telas são reais. Não modifica arquivos da aplicação.
O modo ?qaMode=locked usa o cloud.js original sem configuração Firebase. Nenhum dado real é usado.
Limites: a sessão do cenário simulado não testa autenticação/autorização do Firebase nem concorrência real ou upload. Testes de integração desses serviços ficam para um ambiente Firebase Emulator.
JUnit e evidências nas falhas em reports/. CI automática em PR.
