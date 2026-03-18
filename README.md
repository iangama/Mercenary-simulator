# Mercenary Company

Campaign strategy RPG prototype centered on mercenary logistics, map movement, territorial pressure, rival companies and consequence-heavy mission resolution.

## Current State

This is no longer a bare prototype of contracts and combat. The project now includes:

- strategic map as the main game surface
- travel routes with ETA, weather, access rules and interception risk
- regional war states, siege pressure and rival movement
- contracts tied to geography, deadlines, extraction and strategic value
- company simulation with injuries, deaths, loyalty, stress and progression
- base upgrades plus forward posts with storage, fortification and specialization
- persistent lore/archive rewards and item provenance
- local and remote save with versioned persistence metadata
- modular backend for state, summary, validation and Stripe skeleton checkout

## Product Direction

The current product definition lives in [PRODUCT_MVP.md](/mnt/c/Users/Ian/mercenary-company/PRODUCT_MVP.md).

That document now defines:

- the core fantasy
- target audience
- MVP scope
- demo build scope
- launch-critical requirements
- post-MVP roadmap

## Main Systems

### Campaign

- map-first campaign flow
- route planning and travel orders
- climate, season, permits and route lockouts
- rival companies competing on the same geography
- territorial pressure and front states

### Contracts

- local and remote contracts
- strategic value and travel deadlines
- extraction follow-ups
- negotiation
- richer briefings and reward notes

### Company

- recruit generation by class, trait and origin
- loyalty, ambition, camaraderie and stress
- injuries, deaths and memorial
- squad synergies
- archive and armory accumulation

### Infrastructure

- base upgrades
- forward posts with:
  - stockpiles
  - integrity
  - guard rating
  - level
  - specialization

### Persistence

- local save envelope with version metadata
- Supabase remote save
- optional API-based save flow through backend
- backend validation and summary endpoints

## Architecture

- [src/types/game.ts](/mnt/c/Users/Ian/mercenary-company/src/types/game.ts): canonical domain model
- [src/seed/seedState.ts](/mnt/c/Users/Ian/mercenary-company/src/seed/seedState.ts): initial campaign seed
- [src/services/](/mnt/c/Users/Ian/mercenary-company/src/services): gameplay engines
- [src/app/](/mnt/c/Users/Ian/mercenary-company/src/app): controller and main application shell
- [src/components/](/mnt/c/Users/Ian/mercenary-company/src/components): presentation layer
- [server/src/](/mnt/c/Users/Ian/mercenary-company/server/src): modular backend
- [server/sql/](/mnt/c/Users/Ian/mercenary-company/server/sql): schema, seed and alignment migration

## Important Service Areas

- [combatSimulator.ts](/mnt/c/Users/Ian/mercenary-company/src/services/combatSimulator.ts)
- [strategicMapEngine.ts](/mnt/c/Users/Ian/mercenary-company/src/services/strategicMapEngine.ts)
- [territorialEngine.ts](/mnt/c/Users/Ian/mercenary-company/src/services/territorialEngine.ts)
- [rivalAiEngine.ts](/mnt/c/Users/Ian/mercenary-company/src/services/rivalAiEngine.ts)
- [worldTickEngine.ts](/mnt/c/Users/Ian/mercenary-company/src/services/worldTickEngine.ts)
- [strategicOpsEngine.ts](/mnt/c/Users/Ian/mercenary-company/src/services/strategicOpsEngine.ts)
- [contentEngine.ts](/mnt/c/Users/Ian/mercenary-company/src/services/contentEngine.ts)
- [persistence.ts](/mnt/c/Users/Ian/mercenary-company/src/services/persistence.ts)

## Backend Endpoints

The backend currently exposes:

- `GET /health`
- `GET /state?companyId=...`
- `GET /state/summary?companyId=...`
- `POST /state/validate`
- `PUT /state`
- `POST /stripe/create-checkout-session`

## SQL Order

Run these in order:

1. [001_schema.sql](/mnt/c/Users/Ian/mercenary-company/server/sql/001_schema.sql)
2. [002_seed.sql](/mnt/c/Users/Ian/mercenary-company/server/sql/002_seed.sql)
3. [003_alignment.sql](/mnt/c/Users/Ian/mercenary-company/server/sql/003_alignment.sql)

## Environment

Frontend `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- optional: `VITE_API_BASE_URL`

Backend `server/.env`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- optional: `PORT`
- optional: `CORS_ORIGIN`

## Run

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

Frontend default: `http://localhost:5173`

Backend default: `http://localhost:8787`

## Demo Quickstart

If you are opening the project as a demo rather than a dev sandbox, use this flow first:

1. Open the `Map`
2. Explore the current node
3. Open a `Site Operation`
4. Travel to a remote node
5. Resolve at least one `Journey Incident`
6. Take one contract and review the `Chronicle`

The current build is strongest when played as a `30-45 minute atlas campaign slice`, not as a long sandbox session.

For a tester-facing walkthrough, use [DEMO_GUIDE.md](/mnt/c/Users/Ian/mercenary-company/DEMO_GUIDE.md).
For a presenter/release handoff checklist, use [EXPOSURE_CHECKLIST.md](/mnt/c/Users/Ian/mercenary-company/EXPOSURE_CHECKLIST.md).
For GitHub publishing prep, use [GITHUB_PREP.md](/mnt/c/Users/Ian/mercenary-company/GITHUB_PREP.md).

## Validation

Current validation commands:

```bash
npm run typecheck
npm test
node --check server/src/index.mjs
```

At the latest pass, they are all green.

You can also run the full frontend demo validation with:

```bash
npm run demo:check
```
