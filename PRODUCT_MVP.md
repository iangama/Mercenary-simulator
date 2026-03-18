# Mercenary Company Product Plan

## Core Fantasy

`Lead a mercenary banner across a fractured frontier where movement, logistics, rivalry and hard contracts matter as much as battle.`

## Product Shape

- Genre: `campaign strategy RPG` with `mercenary management`, `map logistics` and `tactical mission resolution`
- Player fantasy: command a company that survives by positioning, timing, intelligence and controlled violence
- Session style: medium-length campaign sessions with high carry-over consequence
- Tone: grim frontier logistics, political opportunism, military exhaustion, relic-haunted landscape

## Target Audience

- Players who like `Battle Brothers`, `Mount & Blade` campaign tension, `Darkest Dungeon` consequence, and `wartime logistics` more than pure city-building
- People who enjoy:
  - hard tradeoffs
  - persistent loss
  - readable but deep systems
  - narrative flavor emerging from simulation

## MVP Definition

The MVP is not “all systems complete.” It is a playable campaign slice with a full loop, identity, and enough content to demonstrate the product.

### MVP Must-Haves

- campaign map as primary play surface
- travel, route choice, permits, weather and interception
- contracts with deadlines, extraction and regional context
- rivals moving and competing on the map
- territorial pressure with siege/conflict states
- company management with injuries, deaths, loyalty/stress and progression
- base + forward posts with real logistical impact
- persistent archive/lore rewards and item provenance
- save/load locally and remotely with versioned payloads
- readable UI with alerts, priorities and campaign summaries

### MVP Success Criteria

- a new player can understand the loop within `10-15 minutes`
- a full campaign run feels coherent over `90-150 minutes`
- at least `3` meaningful strategic pivots happen in one run:
  - route choice
  - contract triage
  - logistical repositioning
- the player can lose through overextension, debt, attrition or territorial pressure
- the player can “win” by reaching a stable dominance state rather than just surviving random days

## MVP Campaign Arc

### Early Game

- stabilize cash flow
- secure nearby contracts
- build first post
- recruit to safe operating size

### Mid Game

- manage rival pressure
- expand to remote contracts
- choose political alignment by action
- protect logistics and avoid company fracture

### Late MVP State

- maintain multiple forward positions
- respond to siege/conflict zones
- outpace rivals in high-value contracts
- push toward `ascendant` or `dominating` campaign status

## MVP Demo Build

This is the build that should be shown first to testers, publishers or public demo players.

### Demo Duration

- target: `30-45 minutes`

### Demo Pillars

- one clear starting company state
- two immediately legible regions
- one hostile frontier
- one commerce corridor
- one rival that pressures contracts
- one lore/relic recovery chain

### Demo Content Checklist

- starting map travel with at least `3` route decisions
- one local contract
- one remote high-value contract
- one interception
- one post establishment / fortification moment
- one rival theft or contest moment
- one archive/relic reward
- one visible consequence in chronicle, memorial or campaign status

## Launch Scope

These are the things that make the game feel launchable, not just interesting.

### Launch-Critical

- stable save compatibility
- clear campaign start and reset flow
- clear defeat and dominance states
- readable route and contract planning
- enough content density to avoid obvious repetition in first several runs
- build instructions and deployment path for frontend + backend

### Post-Launch Candidates

- deeper tactical interception scenes
- account/auth features
- monetization hooks
- advanced analytics
- mod support
- procedural campaign generation beyond current handcrafted seed

## Monetization Position

Recommended current stance:

- `premium, no monetization in MVP`

Reason:

- the project’s strength is campaign depth and consequence, not live-service loops
- monetization would distract from the current value proposition
- a premium or demo-to-premium framing fits the design better

## Retention And Quality Targets

These are product targets, not analytics guarantees.

- first session clarity: player reaches first contract execution without confusion
- first-session hook: player sees at least one rival, one deadline problem and one travel consequence
- repeatability: first `3` runs produce distinct route/contract/logistics stories
- readability: player always knows:
  - where they are
  - what is urgent
  - why a route is risky
  - what the company cannot currently afford

## Current Roadmap After MVP

### Beta

- stronger tactical mission variety
- richer rival personalities and long-term feuds
- more contract chains and special mission events
- more archive/relic content
- more node-specific mechanics

### Commercial Demo

- cleaner onboarding
- stronger visual identity pass
- narrative presentation tightened for first impressions
- prepared public feedback build

### Full Product

- broader region set
- more factions and rival banners
- deeper base specialization
- more tactical encounter types
- expanded relic/field archive ecosystem

## What Counts As “Done” For Product Block

The product block is done when the repo clearly answers:

- what game this is
- who it is for
- what MVP means
- what the first demo should contain
- what is launch-critical versus later

This document is the source of truth for those answers.
