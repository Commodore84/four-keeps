# Four Keeps Development Progress

Updated November 10, 2026 (America/New_York).

## Verified baseline and preservation

This batch began with clean local and GitHub `feat/clean-app-shell` at
`772659346f07c1b27f844f1ed98f39e681114e3a`. No newer changes were present. Work
continues on that branch without resets, discarded work, or force pushes. Existing
identity-free Nighthawk campaigns retain their legacy fallback and rest controls.

## Completed milestones

1. **Level-one recovery:** class Hit Dice, Constitution healing with minimum one
   HP, all HP and Hit Dice on long rest, ordinary versus Pact Magic slot recovery,
   one-use Fighter/Barbarian short-rest recovery, opt-in Wizard Arcane Recovery,
   long-rest pools and Magic Initiate recovery, known Exhaustion levels, explicit
   Elf Trance, and sixteen-hour waiting before starting another long rest.
2. **Build preservation:** new imports store an independent copy of the reviewed
   builder draft. It retains original identity/portrait, ability generation,
   equipment packages and purchases, both equipped weapons, all class choices,
   spellbook, invocations, origin spells and their casting ability, rules settings
   and forecast plans. Forecasts do not grant active features. Old campaigns with
   no snapshot still load; missing historical choices are not fabricated.
3. **Four-class playtests:** browser journeys create Fighter, Rogue, Cleric and
   Wizard through the actual builder, import a campaign, speak with an NPC,
   travel, enter combat, consume inventory/resources/spell slots, settle rewards,
   rest, reload and resume. Cleric checks independent origin-free-cast and class
   slot expenditure; Wizard checks Arcane Recovery. Fighter checks repeat-long-rest
   timing. Full builder snapshots survive the journey unchanged.
4. **Simpler encounter entry:** one form starts a solo player plus a DM-confirmed
   opponent using the existing encounter engine. Companion registration is no
   longer required. Existing companion setup remains available. Scene evidence
   and recent AI DM narration appear alongside the form; no AI statistics, dice,
   or encounter decisions are silently accepted.
5. **Save and AI boundaries:** rest, encounter and reward feedback waits for the
   save result. A forced IndexedDB write failure leaves state unchanged and can
   be retried. AI requests include compact class choices, spellbook, counters and
   shared encounter context. The server preserves Rogue Expertise in sealed
   checks and suppresses legacy auto-combat for imported adventure contexts.

## Verification and environment

- Vitest: 468 passing tests across 53 files.
- Playwright: all 60 tests passed, including four class journeys and a
  forced-save-failure/retry test.
- TypeScript project checks and the production build passed.
- Existing npm build script also runs the complete Vitest suite.
- Managed browser command:
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`.
  This environment requires Chromium execution outside the command sandbox.
- Live AI provider verification is blocked locally: neither `OPENAI_API_KEY` nor
  `FOUR_KEEPS_ACCESS_CODE` is configured in this executor. Browser and API tests
  use mocks. This does not establish whether the deployed server's credentials
  are configured or working. No production secrets were retrieved.
- See [rule references and supported scope](RULES_IMPLEMENTATION.md) for the
  published 2024 sources and explicit manual-adjudication boundaries.

## Playtest readiness checklist

- [x] Fighter, Rogue, Cleric and Wizard creation/import through real UI paths.
- [x] Original reviewed build retained independently of later draft edits.
- [x] Authored NPC interaction and travel retained on save/resume.
- [x] Solo encounter setup without subclass companion scaffolding.
- [x] Verified equipped martial attacks and representative action-spell bookkeeping.
- [x] Separate Magic Initiate free-use and class-slot consumption.
- [x] Short/long recovery and persisted timing/resource checks.
- [x] Failed rest save reports failure and supports retry without lost Hit Dice.
- [x] Legacy training and companion regression coverage retained.
- [ ] Live AI provider response with authorized deployed game credentials.
- [ ] Complete automated spell effects and casting-time/action enforcement.
- [ ] Full manual feature playthroughs for the other eight classes.
- [ ] Automated advancement, preparation changes and rest interruption resumption.

## Remaining limits

Ready for a guided, DM-adjudicated level-one playtest of the four representative
classes. This is not a complete 2024 rules implementation. Recovery supports
single-class level-one imported characters. The DM confirms safe uninterrupted
rests, opponent statistics, rolls and rewards. Spell effects, many class/feat/
species combat effects, bonus/reaction spell timing, material components and
feature-specific action costs still need adjudication. This batch preserves those
choices; it does not claim all their effects are implemented. Old Nighthawk rest
semantics remain unchanged. Old imported saves without build snapshots cannot
recover choices that were never saved.

Rest interruption resumption, temporary ability/max-HP reductions, detailed
conditions without stored levels, food/sleep hazards, rest-driven preparation or
mastery swaps and higher levels remain outside the automated recovery model.
Campaign storage remains local to the browser/device; concurrent tabs still have
last-writer save behavior. Export backups. The production bundle remains above
Vite's 500 kB warning threshold.

## Estimated remaining effort and next batch

Estimate 2–3 additional scoped batches for guided-beta polish, not full class or
rules completeness. Next: finish action/bonus/reaction timing and effects for the
representative spells and core class features already exposed, then strengthen
rest interruption handling, saved-game conflict recovery and live DM verification.
Avoid optional combat expansion.

Estimated interactions: one Continue click to resume a selected saved campaign;
roughly 35–50 button/checkbox actions plus form entries for a fresh character's
combat/reward/recovery journey. Solo encounter setup uses one confirmation and
one start click after its fields are supplied. A short or long rest needs a safety
confirmation and a completion click, plus any optional die, recovery, Trance or
waiting choice. These are estimates, not measured user telemetry.
