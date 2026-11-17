# Evolução do projeto

## 2026-11-17 — persistência e organização

### Formulário após conflito de gravação
- Problema: quando outra sessão salvava antes, a lista era recarregada, mas o formulário antigo continuava aberto e permitia reaplicar dados desatualizados.
- Correção: fechar o formulário antes da recarga e preservar um código de erro identificando conflito.
- Validação: teste com SDK simulado verifica que a revisão antiga é rejeitada, o formulário fecha e os dados atuais são preservados.

### Inicialização e manutenção
- Problema: implementações antigas coexistiam com funções que as substituíam em outros arquivos, dificultando identificar o fluxo utilizado.
- Correção: remover funções substituídas e iniciar a aplicação em bootstrap.js após carregar os módulos.
- Validação: sintaxe JavaScript e regressão de interface executada no CI do PR. O resultado efetivo deve ser conferido nos checks.

### QA de interface
- Automação existente preservada: 15 cenários de reservas, limites de horário, busca, pagamentos e falha de persistência.
- Testes usam dados fictícios. Nenhuma configuração, identidade visual ou informação do cliente foi importada.

### Navegação sem renderização duplicada
- O CI detectou referência obsoleta a um elemento durante a abertura da frota. A navegação atualizava o hash e renderizava imediatamente, e o evento hashchange renderizava a mesma tela novamente.
- A navegação agora atualiza o histórico com pushState e renderiza uma vez. O tratamento de hashchange continua disponível para navegação pelo histórico e links.
- Um teste adicional verifica o número de renderizações e a URL resultante.

### Limites conhecidos
- A automação de interface usa persistência em memória nos cenários autenticados.
- Este repositório ainda não inclui testes de regras, autenticação real, uploads nem concorrência entre sessões reais.
- Regras e implantação do projeto do cliente não são inferidas a partir dos resultados destes testes.
