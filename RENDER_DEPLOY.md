# Deploy No Render

Este projeto já está preparado para deploy no Render com:

- backend Node como `Web Service`
- frontend Vite como `Static Site`
- blueprint em [render.yaml](/mnt/c/Users/Ian/mercenary-company/render.yaml)

## Links

- Dashboard do Render: https://dashboard.render.com/
- Blueprint / IaC do Render: https://render.com/docs/infrastructure-as-code
- Static Site no Render: https://render.com/docs/static-sites
- Web Service no Render: https://render.com/docs/web-services

## Caminho Mais Fácil

1. Garanta que o repositório já está no GitHub:
   - `https://github.com/iangama/Mercenary-simulator.git`
2. Entre no Render e conecte sua conta do GitHub.
3. Clique em `New +`.
4. Escolha `Blueprint`.
5. Selecione o repositório `Mercenary-simulator`.
6. O Render vai ler o [render.yaml](/mnt/c/Users/Ian/mercenary-company/render.yaml) e criar:
   - `mercenary-company-api`
   - `mercenary-company-web`

## Variáveis Que Você Vai Precisar Preencher

### Backend

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `CORS_ORIGIN`

### Frontend

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL`

## Ordem Recomendada

1. Criar o blueprint
2. Preencher as variáveis do backend
3. Fazer o primeiro deploy do backend
4. Copiar a URL pública do backend
5. Colocar essa URL em `VITE_API_BASE_URL` no frontend
6. Colocar a URL pública do frontend em `CORS_ORIGIN` no backend
7. Fazer redeploy dos dois

## Exemplos

### `VITE_API_BASE_URL`

```text
https://mercenary-company-api.onrender.com
```

### `CORS_ORIGIN`

```text
https://mercenary-company-web.onrender.com
```

## Comandos De Build Usados

### Frontend

- build: `npm install && npm run build`
- publish dir: `dist`

### Backend

- build: `npm install`
- start: `npm start`

## Depois Do Primeiro Deploy

Se você atualizar o projeto no GitHub, o Render faz redeploy automático.

Fluxo normal:

```bash
cd C:\Users\Ian\mercenary-company
git add .
git commit -m "Sua atualização"
git push
```

## Observações

- `CORS_ORIGIN` está como `*` no blueprint para facilitar o primeiro deploy.
- Depois que o frontend estiver publicado, vale trocar `*` pela URL real do site.
- Se você quiser, depois eu também posso te preparar uma configuração alternativa para `Railway`, mas para este projeto o Render é o caminho mais direto.
