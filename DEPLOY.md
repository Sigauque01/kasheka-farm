# 🌿 Kasheka Farm — Deploy Online GRATUITO
## Railway.app + GitHub (5 passos, ~15 minutos)

---

## O QUE VAIS PRECISAR
- Conta no **GitHub** (gratuito) → https://github.com
- Conta no **Railway** (gratuito) → https://railway.app
- Nada mais — sem cartão de crédito necessário para começar

---

## PASSO 1 — Criar repositório no GitHub

1. Vai a https://github.com → **Sign up** (se não tens conta)
2. Clica em **"New repository"**
3. Nome: `kasheka-farm`
4. Deixa **Private** (privado — os teus dados ficam só teus)
5. Clica **"Create repository"**
6. Faz upload de todos os ficheiros desta pasta para o repositório
   - Clica **"uploading an existing file"**
   - Arrasta todos os ficheiros e pastas
   - Clica **"Commit changes"**

---

## PASSO 2 — Criar projecto no Railway

1. Vai a https://railway.app → **Login with GitHub**
2. Clica **"New Project"**
3. Escolhe **"Deploy from GitHub repo"**
4. Selecciona `kasheka-farm`
5. Railway vai detectar o Node.js automaticamente ✅

---

## PASSO 3 — Adicionar a base de dados MySQL

1. No painel do teu projecto Railway, clica **"New"** → **"Database"** → **"MySQL"**
2. Aguarda 1-2 minutos até criar
3. Clica na base de dados criada → aba **"Variables"**
4. Copia os valores:
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`

---

## PASSO 4 — Configurar variáveis de ambiente

1. Clica no teu serviço `kasheka-farm` (não na base de dados)
2. Vai à aba **"Variables"**
3. Clica **"New Variable"** e adiciona cada uma:

| Variável | Valor |
|----------|-------|
| `DB_HOST` | (copia do MYSQL_HOST) |
| `DB_PORT` | (copia do MYSQL_PORT) |
| `DB_USER` | (copia do MYSQL_USER) |
| `DB_PASS` | (copia do MYSQL_PASSWORD) |
| `DB_NAME` | (copia do MYSQL_DATABASE) |
| `DB_SSL`  | `true` |

4. Railway vai reiniciar automaticamente ✅

---

## PASSO 5 — Obter o link público

1. No serviço `kasheka-farm` → aba **"Settings"**
2. Em **"Domains"** → clica **"Generate Domain"**
3. Vais receber um link tipo:
   ```
   https://kasheka-farm-production.up.railway.app
   ```
4. **Este link funciona em qualquer device, qualquer hora, sem o laptop ligado!** 🎉

---

## COMO ACEDER

- **Laptop:** abre o link no browser
- **Telemóvel:** abre o link → menu do browser → **"Adicionar ao ecrã inicial"**
- **Telemóvel da mãe:** envia o link pelo WhatsApp — ela abre e usa normalmente

---

## LIMITES DO PLANO GRATUITO

| Recurso | Limite gratuito |
|---------|----------------|
| Horas de servidor | 500h/mês (suficiente para uso contínuo) |
| Base de dados | 1 GB de armazenamento |
| Largura de banda | 100 GB/mês |

Para o uso da Kasheka Farm, o plano gratuito é mais que suficiente.

---

## ACTUALIZAR O SISTEMA NO FUTURO

Quando quiseres fazer alterações ao sistema:
1. Edita os ficheiros
2. Faz upload para o GitHub (substituindo os ficheiros antigos)
3. Railway detecta automaticamente e actualiza em segundos ✅

---

## PROBLEMAS COMUNS

| Problema | Solução |
|----------|---------|
| "Application error" | Verifica as variáveis DB_* na aba Variables |
| Página em branco | Aguarda 2-3 minutos após o deploy |
| Dados não aparecem | O servidor cria as tabelas automaticamente na 1ª execução |

---

*Kasheka Farm · Maputo, Moçambique 🌿*
