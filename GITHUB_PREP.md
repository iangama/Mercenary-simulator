# GitHub Prep

Use this file when turning the local folder into a publishable GitHub repository.

## What Is Already Prepared

- frontend validation script: `npm run demo:check`
- tester-facing guide: [DEMO_GUIDE.md](/mnt/c/Users/Ian/mercenary-company/DEMO_GUIDE.md)
- exposure checklist: [EXPOSURE_CHECKLIST.md](/mnt/c/Users/Ian/mercenary-company/EXPOSURE_CHECKLIST.md)
- product scope: [PRODUCT_MVP.md](/mnt/c/Users/Ian/mercenary-company/PRODUCT_MVP.md)
- CI workflow: [.github/workflows/ci.yml](/mnt/c/Users/Ian/mercenary-company/.github/workflows/ci.yml)
- sanitized env examples:
  - [.env.example](/mnt/c/Users/Ian/mercenary-company/.env.example)
  - [server/.env.example](/mnt/c/Users/Ian/mercenary-company/server/.env.example)

## Before First Push

1. Confirm local validation:
   `npm run demo:check`
2. Confirm backend syntax:
   `node --check server/src/index.mjs`
3. Ensure real secrets are only in:
   - `.env`
   - `server/.env`
4. Do not commit:
   - `node_modules/`
   - `dist/`
   - `.env`
   - `server/.env`

## Suggested First Push Sequence

```bash
cd C:\Users\Ian\mercenary-company
git init
git add .
git commit -m "Prepare mercenary-company demo build"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## Suggested Repo Description

`Map-first mercenary campaign RPG prototype focused on travel, logistics, rival pressure, landmarks and consequence-heavy contracts.`

## Suggested Topics

- `typescript`
- `react`
- `vite`
- `strategy-game`
- `rpg`
- `indie-game`
- `simulation`
- `supabase`

## After Push

1. Check GitHub Actions CI
2. Add screenshots or a short GIF from the atlas
3. Decide hosting path:
   - frontend only
   - frontend + backend
4. Then configure deploy
