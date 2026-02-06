# Rotina do vendedor (guia rápido)

Este documento explica **para que serve cada página** do app e sugere uma **rotina prática** (quando abrir cada uma).

## TL;DR (se você só ler um pedaço)

- **Começo do dia**: `Dashboard` → `Leads (Contatar hoje)` → atacar **Atrasados**
- **Execução**: `Leads` → abrir lead → `Cadastrar` (registrar resultado/comentário/áudio)
- **Contexto rápido**: `Atividade` (ver último comentário + tocar áudio)
- **Auditoria/consulta**: `Planilha` (visão tabular)

## Mapa rápido (rotas)

- **Cadastrar (Nova Interação)**: `/`
- **Dashboard**: `/dashboard`
- **Leads**: `/leads`
- **Atividade** (interações recentes): `/atividade`
- **Planilha** (visão tabular do banco): `/planilha`

> Dica: no mobile, a navegação principal fica no menu inferior (**BottomNav**).

---

## O que cada página faz

### 1) Cadastrar (Nova Interação) — `/`

**Objetivo:** registrar o que você fez agora com um cliente (ligação ou mensagem).

**Quando usar:**
- Quando você acabou de ligar/enviar mensagem e quer registrar o resultado.
- Quando você precisa fazer follow-up e quer **registrar o “vácuo”** (não respondeu / não atendeu).

**O que você consegue fazer aqui:**
- Selecionar um lead (pelo campo de busca ou “buscar sem digitar”).
- Registrar a interação (resultado + comentário + áudio).
- Se der “vácuo”, o sistema **agenda automaticamente** o próximo follow-up pela regra de dias.

**Regra mental:** “Fiz algo agora” → registro aqui.

---

### 2) Dashboard — `/dashboard`

**Objetivo:** visão rápida do dia.

**Quando usar:**
- Ao abrir o app no começo do dia.
- Para checar rapidamente se você está fazendo volume suficiente e o que está pendente.

**O que você vê aqui:**
- Contagens do dia (ligações, mensagens, novos, follow-ups).
- Taxa de engajamento.
- Próximos contatos pendentes.
- Interações recentes (com comentário + áudio) e link para ver tudo.

**Regra mental:** “Quero saber como está o dia” → abre aqui.

---

### 3) Leads — `/leads`

**Objetivo:** sua “lista de trabalho” para decidir quem contatar.

**Quando usar:**
- Quando você quer priorizar: **hoje / amanhã / semana**.
- Quando quer achar leads “friando” (sem atualização há X dias).
- Quando quer ver quem **nunca foi contatado**.

**O que você consegue fazer aqui:**
- Filtrar por:
  - **Contatar hoje**
  - **Contatar amanhã**
  - **Contatar na semana**
  - **Sem update (X dias)**
  - **Nunca contatado**
- Ver alertas como **Atrasado** (quando existe contato previsto já vencido).
- Clicar no lead e abrir direto em **Cadastrar** já com o lead selecionado.

**Regra mental:** “Quem eu devo contatar agora?” → abre aqui.

---

### 4) Atividade (Interações recentes) — `/atividade`

**Objetivo:** “o que eu fiz recentemente” com foco em recuperar contexto rápido.

**Quando usar:**
- Antes de mandar mensagem para alguém e querer lembrar “o que eu escrevi por último”.
- Para ouvir áudios rapidamente e retomar a conversa sem reabrir tudo.

**O que você vê aqui:**
- Aba **Por lead**: um card por cliente (última interação realizada).
- Aba **Todas**: feed cronológico de interações realizadas.
- Cada item mostra:
  - último comentário
  - player do áudio (se existir)
  - botão para abrir o cadastro daquele lead

**Regra mental:** “Me lembra o que falei com esse cliente” → abre aqui.

---

### 5) Planilha — `/planilha`

**Objetivo:** visão “tabela/Excel” para conferir o banco e fazer auditoria rápida.

**Quando usar:**
- Quando você quer enxergar muitos campos de uma vez.
- Para validar dados e fazer consultas rápidas por texto.

**O que você vê aqui:**
- Aba **Leads**: colunas principais + último/próximo contato.
- Aba **Interações**: histórico de interações.
- Clique em uma linha para abrir o lead no cadastro.

> Observação: no mobile, a Planilha é mais “consulta” do que “uso diário”.

**Regra mental:** “Quero ver o banco como tabela (auditoria)” → abre aqui.

---

## Rotina sugerida (dia do vendedor)

### Começo do dia (5–10 min)
- Abrir **Dashboard** (`/dashboard`)
  - ver “Follow-ups hoje” e “Próximos contatos”
  - olhar “Nunca contatados”
- Ir para **Leads** (`/leads`) e aplicar filtro **Contatar hoje**
  - resolver primeiro os **Atrasados**

### Bloco de execução (ligação/mensagem)
- Abrir **Leads** (`/leads`) → escolher um lead → tocar e abrir em **Cadastrar** (`/?lead=...`)
- Em **Cadastrar** (`/`)
  - registrar resultado + comentário + áudio
  - se for “vácuo”, o app agenda o próximo follow-up automaticamente

### Durante o dia (entre contatos)
- Abrir **Atividade** (`/atividade`)
  - achar rapidamente o cliente pelo nome/WhatsApp
  - reler o último comentário
  - tocar o áudio e retomar contexto

### Final do dia (3–5 min)
- Voltar no **Dashboard**
  - conferir “Novos hoje” vs “Follow-ups hoje”
  - checar se ainda existem pendências para amanhã

---

## Regra de follow-up (resumo)

Quando o resultado for “vácuo”:
- 2ª tentativa: **+1 dia**
- 3ª tentativa: **+3 dias** depois da 2ª
- 4ª tentativa: **+6 dias** depois da 3ª

O app cria uma interação **prevista** (pendente) seguindo essa sequência.

