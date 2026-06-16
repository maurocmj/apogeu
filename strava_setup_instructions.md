# Configuração da Integração com o Strava no Apogeu

Este guia orienta na criação do aplicativo do Strava e na configuração das chaves no projeto.

## 1. Criar o Aplicativo no Strava Developers

1. Acesse o portal do Strava Developers em: https://www.strava.com/settings/api
2. Se não estiver logado, faça login na sua conta do Strava.
3. Preencha o formulário para criar um novo aplicativo:
   - **Application Name:** APOGEU (ou o nome do seu mockup)
   - **Category:** Health / Fitness
   - **Club:** (Deixe em branco)
   - **Website:** `http://localhost:5173` (ou a URL de produção)
   - **Application Description:** Plataforma Apogeu integrada com Strava.
   - **Authorization Callback Domain:** `localhost` (para desenvolvimento local)
4. Salve e envie o formulário.
5. Copie os seguintes campos gerados:
   - **Client ID** (ex: `123456`)
   - **Client Secret** (ex: `a1b2c3d4...`)

---

## 2. Configurar as Variáveis de Ambiente

### No Frontend (Local)
No arquivo `.env.local` localizado em `healthcare-mockup/.env.local`, adicione a seguinte variável:
```env
VITE_STRAVA_CLIENT_ID=SEU_CLIENT_ID_DO_STRAVA
```

### No Supabase (Edge Functions)
As Edge Functions rodam na nuvem do Supabase (ou localmente via Supabase CLI). Elas precisam do `Client Secret` e `Client ID` para trocar o código OAuth por tokens.

#### Desenvolvimento Local (com Supabase CLI)
Crie um arquivo `.env` dentro da pasta `supabase/` se ainda não existir, ou execute no terminal:
```bash
supabase secrets set STRAVA_CLIENT_ID="SEU_CLIENT_ID_DO_STRAVA" STRAVA_CLIENT_SECRET="SEU_CLIENT_SECRET_DO_STRAVA"
```

---

## 3. Fluxo de Autorização do Usuário

O fluxo OAuth 2.0 funciona da seguinte forma:
1. O usuário clica em "Conectar Strava" na tela de Integrações do Apogeu.
2. O Apogeu redireciona o usuário para:
   `https://www.strava.com/oauth/authorize?client_id=[CLIENT_ID]&redirect_uri=[WINDOW_LOCATION_ORIGIN]/integracoes/callback&response_type=code&scope=activity:read_all`
3. O usuário autoriza o acesso.
4. O Strava redireciona o usuário de volta para o Apogeu na rota:
   `/integracoes/callback?code=[CÓDIGO_DE_AUTORIZAÇÃO]`
5. O frontend captura este `code` e invoca a Supabase Edge Function `/strava-integration` na rota `/exchange`.
6. A Edge Function faz a chamada segura para o Strava, troca o código por tokens, salva no banco e faz o primeiro sync.
