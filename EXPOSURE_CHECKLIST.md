# Exposure Checklist

Use this before showing the build to testers, collaborators or public viewers.

## Build Health

- Run `npm run demo:check`
- Confirm frontend opens without console-breaking errors
- Confirm onboarding appears on a clean reset
- Confirm at least one landmark can be discovered and opened
- Confirm at least one journey incident can be resolved
- Confirm at least one contract can be completed

## Presentation

- Start on the `Map`
- Keep the first explanation short: movement, timing and logistics first
- Do not start on `Base`, `Rivals` or `Memorial`
- Show one short complete run, not every system
- End in `Chronicle` to highlight consequence

## Demo Route

Suggested showcase path:

1. Explore the current node
2. Open a site operation
3. Travel to a second node
4. Resolve a journey/interception problem
5. Execute one contract
6. Review result and chronicle

## If Showing To External Testers

- Tell them the build is `pre-alpha`
- Ask them to focus on clarity, tension and curiosity
- Capture first confusion point
- Capture whether the map feels alive
- Capture whether travel feels meaningful

## If Recording Footage

- Record from the map screen
- Keep session under `10-15 minutes`
- Show one discovery, one journey problem and one contract
- Avoid dead time in passive menu browsing

## Before Deploy

- Re-check `.env` and `server/.env` handling
- Decide frontend-only or full-stack hosting path
- Verify Supabase keys are correct for the chosen environment
- Validate `/health` on backend
- Confirm production build output from `npm run build`

## Not Yet Launch-Critical

These should not block demo exposure right now:

- full deployment setup
- commercial analytics
- auth/account system
- deep content-complete balance
- final production UI polish
