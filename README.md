# Gestão de Locação de Reboques

Sistema web para uma locadora de reboques controlar **agenda, clientes, frota e recebimentos** em um só lugar. Desenvolvido como freelance para uma empresa real.

> Este repositório é uma versão de portfólio: o nome, a identidade visual e as credenciais do cliente foram removidos. Nenhum dado real está aqui.

## Funcionalidades

- **Visão geral:** retiradas e devoluções do dia, locações em andamento, atrasos e saldo a receber, com navegação por semana.
- **Agenda e locações:** reserva por reboque e por período (meio período ou integral), com bloqueio de conflito de horário e de reboque com devolução atrasada.
- **Clientes:** cadastro com dois telefones, contato extra e endereço; vários veículos por cliente (placa no padrão antigo ou Mercosul); conferência da CNH com validade.
- **Retirada e devolução:** checklists obrigatórios (documentos, placa, engate, iluminação, pneus), registro do horário real e de adicionais combinados.
- **Recebimentos:** pagamentos parciais e estornos (Pix, dinheiro, cartão, transferência), com saldo calculado em centavos para evitar erro de arredondamento.
- **Frota:** reboques com valores de meio período e integral. Alterar um valor não muda as locações já registradas, porque cada locação guarda uma cópia (snapshot) do reboque e do veículo.
- **Usuários e permissões:** perfis **Atendimento** e **Administrador**; só administradores gerenciam acessos.
- **Auditoria:** cada alteração registra quem fez e quando.

## Arquitetura

```
index.html                 tela única (login + área de gestão)
domain.js                  regras de negócio puras (validações, pagamentos), sem dependência do Firebase
app.js / weekly.js         painel, agenda e visão semanal
management.js              clientes, veículos, frota, locações, retirada e devolução
documents.js               ficha do cliente, conferência e anexos
users.js                   gestão de usuários e perfis
cloud.js                   login, leitura e gravação no Firebase
firebase-config.example.js modelo de configuração
```

- **Front-end em JavaScript puro**, sem framework e sem etapa de build.
- **Firebase Authentication** para login e **Cloud Firestore** para os dados. O acesso depende do login e das regras de segurança do projeto.
- **Controle de concorrência:** cada gravação confere a revisão dos dados. Se outra pessoa salvou antes, o sistema recarrega e pede para repetir a alteração, em vez de sobrescrever.
- Mensagens de erro em português claro para falta de permissão, conflito e falta de conexão.

## Como rodar

1. Crie um projeto no [Firebase](https://console.firebase.google.com) com **Authentication (e-mail e senha)** e **Cloud Firestore**.
2. Copie `firebase-config.example.js` para `firebase-config.js` e preencha com os dados do seu app da Web.
3. Sirva a pasta com qualquer servidor estático:

```bash
npx serve .
# ou publique com: firebase deploy --only hosting
```

Sem o `firebase-config.js`, o sistema abre em modo "em preparação" e não grava nada.

## Tecnologias

JavaScript · HTML · CSS · Firebase Authentication · Cloud Firestore · Firebase Hosting

## Autor

**Eduardo Consul** · [LinkedIn](https://www.linkedin.com/in/eduardo-consul/) · [GitHub](https://github.com/Dudu02170)
