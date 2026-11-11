# Four Keeps Development Progress

Date: November 10, 2026 (America/New_York).

## Verified starting point

Remote `feat/clean-app-shell` was fetched and verified at
`15ca17b15de4900af1dc47ac28cb0ea09cd18452`, exactly checkpoint `15ca17b`.
The clean local `work` checkout at `436d3ae` was an ancestor. No reset, discard,
force push, or worktree replacement was used.

## Delivered milestones

1. Imported player bridge: character class, saving throws, weapon proficiencies,
   owned/equipped catalog gear, class spell slots, and level-one resource counters
   feed the existing shared encounter. All twelve class profiles have unit coverage.
   Imported sheets display their own identity, class, features, inventory and state.
2. Prototype isolation: legacy Nighthawk mutation entry points reject imported
   characters; Rogue advancement rejects other classes. Identity-free Nighthawk
   saves retain their existing fallback. Shared encounters retain the `nighthawk`
   participant key and older function names for save/API compatibility.
3. Persistent completion: conflict-checked player HP, conditions and death saves
   return to the sheet. Slots and class-resource expenditures persist immediately.
   Imported inventory uses the ledger without counting the legacy aliases twice.
   Rewards settle XP, gold and item quantities in one campaign save, with a durable
   encounter settlement marker preventing repeated claims. Imported adventures
   require recording rewards (zero is valid) before returning to exploration.
4. Regression and playtest coverage: the real browser journey creates a Fighter
   through every builder step, imports it, registers a companion, speaks with the
   watchkeeper, travels, configures and attacks an enemy, spends Second Wind,
   records damage and rewards, reloads, and checks HP/resources/inventory on resume.
   Vitest now also includes the previously excluded `tests/*.test.ts` files.

## Playtest readiness

- [x] Validated character creation and import through the UI.
- [x] Authored NPC interaction and travel persist.
- [x] Shared combat uses the saved player and verified equipped attack statistics.
- [x] Legacy training regression coverage retained.
- [x] HP, class resources, XP and loot survive save/reload/resume.
- [x] Corrupted resource pools and conflicting HP synchronization are rejected.
- [ ] All class-feature effects, rest recovery and class advancement automated.
- [ ] Full manual playthrough for every class and subclass.
- [ ] Live AI DM provider response verified (browser API tests use mocks).

This is a guided, DM-adjudicated level-one vertical slice, not a class-complete
release. Encounter entry still requires a registered companion and verified
initiative/HP. Enemy statistics, dice and rewards require manual input. Spell
and resource effects require DM adjudication; spending a counter does not apply
the effect. Special recovery rules, fighting-style modifiers, species/feat
combat effects and higher-level progression are not generally automated.
Local saves remain device/browser specific; export backups. Concurrent browser
tabs still use the existing last-writer save behavior. Some shared UI/log messages
retain legacy Nighthawk terminology. The production bundle exceeds Vite's 500 kB
warning threshold.

## Validation

Vitest: 425 passing tests across 50 files. Playwright: 55 tests in the full suite.
TypeScript project checks and the production build pass. The browser suite is
rerun against the frozen source before committing.

## Validation commands

```sh
npm ci
npm test
npx tsc -b
npm run build
npm run test:e2e
```

The managed environment has system Chromium rather than Playwright's bundled
browser. It required browser execution outside the command sandbox:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Normal CI continues to install Playwright Chromium and does not need this variable.
See the batch report for final test totals, commit SHA and exact deployment status.

## Remaining effort estimate and next batch

For this guided playtest, allow roughly 35–45 button clicks plus form entries from
a fresh character; an existing saved adventure resumes with one Continue click.
These are estimates, not measured interaction telemetry.

Next recommended development batch: finish class-neutral rest/resource recovery
and core class-feature adjudication, preserve imported build choices needed for
those rules, add representative caster and martial full journeys, then streamline
the companion/DM setup into a guided adventure encounter. Avoid additional combat
options until these existing paths are reliable. Broad beta readiness cannot be
estimated accurately until the remaining class-feature scope is agreed.
