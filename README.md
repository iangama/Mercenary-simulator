# Mercenary Company

Prototype de RPG estratégico de campanha focado em logística mercenária, deslocamento no mapa, pressão territorial, companhias rivais e resolução de missões com consequência.

## Estado Atual

O projeto já não é mais um esboço simples de contratos e combate. Hoje ele inclui:

- mapa estratégico como superfície principal do jogo
- rotas com ETA, clima, permissões e risco de interceptação
- estados regionais de guerra, cerco e presença rival
- contratos ligados à geografia, prazo, extração e valor estratégico
- simulação da companhia com ferimentos, mortes, lealdade, estresse e progressão
- upgrades de base e postos avançados com estoque, fortificação e especialização
- recompensas persistentes de lore/arquivo e itens com proveniência
- save local e remoto com metadados versionados
- backend modular para estado, resumo, validação e skeleton de Stripe

## Direção De Produto

A definição atual do produto está em [PRODUCT_MVP.md](/mnt/c/Users/Ian/mercenary-company/PRODUCT_MVP.md).

Esse documento define:

- fantasia central
- público-alvo
- escopo de MVP
- escopo da demo
- requisitos críticos para lançamento
- roadmap pós-MVP

## Sistemas Principais

### Campanha

- fluxo de campanha orientado pelo mapa
- planejamento de rota e ordens de viagem
- clima, estação, permissões e bloqueios de rota
- companhias rivais competindo no mesmo mapa
- pressão territorial e estados de fronteira

### Contratos

- contratos locais e remotos
- valor estratégico e prazo geográfico
- extração pós-missão
- negociação
- briefings e notas de recompensa mais ricas

### Companhia

- geração de recrutas por classe, traço e origem
- lealdade, ambição, camaradagem e estresse
- ferimentos, mortes e memorial
- sinergias de squad
- arquivo e arsenal persistentes

### Infraestrutura

- upgrades de base
- postos avançados com:
  - estoque
  - integridade
  - guarda
  - nível
  - especialização

### Persistência

- save local com envelope versionado
- save remoto via Supabase
- fluxo opcional de save via backend
- backend com validação e resumo de campanha

## Arquitetura

- [src/types/game.ts](/mnt/c/Users/Ian/mercenary-company/src/types/game.ts): modelo canônico do domínio
- [src/seed/seedState.ts](/mnt/c/Users/Ian/mercenary-company/src/seed/seedState.ts): seed inicial da campanha
- [src/services/](/mnt/c/Users/Ian/mercenary-company/src/services): engines e regras de gameplay
- [src/app/](/mnt/c/Users/Ian/mercenary-company/src/app): controller e shell principal da aplicação
- [src/components/](/mnt/c/Users/Ian/mercenary-company/src/components): camada de apresentação
- [server/src/](/mnt/c/Users/Ian/mercenary-company/server/src): backend modular
- [server/sql/](/mnt/c/Users/Ian/mercenary-company/server/sql): schema, seed e migração de alinhamento

## Áreas Importantes Do Código

- [combatSimulator.ts](/mnt/c/Users/Ian/mercenary-company/src/services/combatSimulator.ts)
- [strategicMapEngine.ts](/mnt/c/Users/Ian/mercenary-company/src/services/strategicMapEngine.ts)
- [territorialEngine.ts](/mnt/c/Users/Ian/mercenary-company/src/services/territorialEngine.ts)
- [rivalAiEngine.ts](/mnt/c/Users/Ian/mercenary-company/src/services/rivalAiEngine.ts)
- [worldTickEngine.ts](/mnt/c/Users/Ian/mercenary-company/src/services/worldTickEngine.ts)
- [strategicOpsEngine.ts](/mnt/c/Users/Ian/mercenary-company/src/services/strategicOpsEngine.ts)
- [contentEngine.ts](/mnt/c/Users/Ian/mercenary-company/src/services/contentEngine.ts)
- [persistence.ts](/mnt/c/Users/Ian/mercenary-company/src/services/persistence.ts)

## Endpoints Do Backend

Atualmente o backend expõe:

- `GET /health`
- `GET /state?companyId=...`
- `GET /state/summary?companyId=...`
- `POST /state/validate`
- `PUT /state`
- `POST /stripe/create-checkout-session`

## Ordem Do SQL

Execute nesta ordem:

1. [001_schema.sql](/mnt/c/Users/Ian/mercenary-company/server/sql/001_schema.sql)
2. [002_seed.sql](/mnt/c/Users/Ian/mercenary-company/server/sql/002_seed.sql)
3. [003_alignment.sql](/mnt/c/Users/Ian/mercenary-company/server/sql/003_alignment.sql)

## Variáveis De Ambiente

Frontend `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- opcional: `VITE_API_BASE_URL`

Backend `server/.env`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- opcional: `PORT`
- opcional: `CORS_ORIGIN`

## Rodando Localmente

Frontend:

```bash
cd C:\Users\Ian\mercenary-company
npm install
npm run dev
```

Backend:

```bash
cd C:\Users\Ian\mercenary-company\server
npm install
npm run dev
```

Padrão:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8787`

## Fluxo Rápido Da Demo

Se a ideia for testar a demo e não explorar tudo como sandbox, siga este fluxo:

1. abrir o `Map`
2. explorar o nó atual
3. abrir uma `Site Operation`
4. viajar para outro nó
5. resolver pelo menos um `Journey Incident`
6. pegar um contrato e revisar a `Chronicle`

A build atual funciona melhor como uma demo de `30-45 minutos` de campanha estratégica, não como sandbox longa.

Documentos auxiliares:

- [DEMO_GUIDE.md](/mnt/c/Users/Ian/mercenary-company/DEMO_GUIDE.md)
- [EXPOSURE_CHECKLIST.md](/mnt/c/Users/Ian/mercenary-company/EXPOSURE_CHECKLIST.md)
- [GITHUB_PREP.md](/mnt/c/Users/Ian/mercenary-company/GITHUB_PREP.md)
- [RENDER_DEPLOY.md](/mnt/c/Users/Ian/mercenary-company/RENDER_DEPLOY.md)

## Validação

Comandos principais:

```bash
npm run typecheck
npm test
node --check server/src/index.mjs
```

Validação completa da demo:

```bash
npm run demo:check
```

## Subir Para O GitHub

Primeira subida do projeto:

```bash
cd C:\Users\Ian\mercenary-company
git init
git branch -M main
git remote add origin https://github.com/iangama/Mercenary-simulator.git
git add .
git commit -m "Initial playable campaign build"
git push -u origin main
```

Se `origin` já existir:

```bash
git remote set-url origin https://github.com/iangama/Mercenary-simulator.git
```

Se o Git reclamar de identidade:

```bash
git config user.name "Ian Gama"
git config user.email "SEU_EMAIL_DO_GITHUB"
```

## Como Atualizar O Repositório Depois

Depois da primeira subida, o fluxo normal é:

```bash
cd C:\Users\Ian\mercenary-company
git status
git add .
git commit -m "Describe update"
git push
```

Se quiser revisar antes de commitar:

```bash
git diff
```

## Observações

- não suba `.env` nem `server/.env`
- use os arquivos `.env.example` como referência
- se for publicar online depois, escolha a estratégia de deploy separadamente
