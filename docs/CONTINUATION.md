# Four Keeps continuation and environment recovery

Read this document **before starting any continuation task**. Also read [RELEASE_CHECKS.md](RELEASE_CHECKS.md).

## Mandatory continuation prompt preamble

**Copy this block verbatim into every new Four Keeps continuation prompt or Proceed button, before the feature request:**

> Continue Four Keeps in `Commodore84/four-keeps`. FIRST use the GitHub connection to read `docs/CONTINUATION.md` and `docs/RELEASE_CHECKS.md` from the current working branch. Recover the existing Vercel sandbox `four-keeps-m1-b2` using `get_named_sandbox(resume:true)`; verify its `/vercel/four-keeps` checkout, GitHub connectivity, and available test runner. A local container error such as `Could not resolve host: github.com` is NOT a reason to stop or demand another chat. Preserve dirty work; create an isolated worktree from the verified candidate SHA. If the sandbox is unavailable, investigate alternate Vercel sessions and GitHub-connected execution before reporting a specific blocker. Verify current foundation/candidate SHAs rather than assuming old ones. Run the full required release checks and only publish after exact-SHA CI and Vercel READY. Do not ask me to start another chat because one execution environment failed.

**Chat capacity warning in every Four Keeps handoff:** Approximately every five user requests (not tool calls), offer an approximate estimate of remaining user requests in the current chat. Distinguish short conversational requests from development-heavy ones, and warn before major development if a fresh chat is safer. Never claim to know exact remaining tokens or a hard request limit. Preserve this instruction in each continuation prompt. This is a conversation-management estimate, not an executable repository check.

**Handoff generator rule:** Never produce a Four Keeps Proceed button or new-chat continuation prompt that omits the preamble above. Keep the exact feature requirements after it. This file is a repository convention; it cannot automatically inject text into ChatGPT messages, so the continuation author must include it explicitly.

## Recover the actual state
1. Query GitHub for the current HEAD of `feat/clean-app-shell`; never assume a SHA copied from an earlier chat is still current.
2. Check existing isolated development branches, open PRs, relevant CI runs, and deployment status before creating new work. Distinguish the latest **published/verified foundation** from the latest **unfinished candidate**. Do not overwrite unfinished work.
3. Read the requested feature's existing code, tests, and relevant docs before editing. Preserve campaigns, rules, merchants, persistence, and Anchamida canon unless specifically requested otherwise.

## Verified executable recovery route (2026-11-22)
- The persistent Vercel sandbox **four-keeps-m1-b2** belongs to the Vercel **four-keeps** project. It was successfully resumed through the Vercel connection with `get_named_sandbox(resume:true)`, then commands ran through `run_session_command`.
- The sandbox's `/vercel/four-keeps` checkout can resolve and fetch from `github.com`, even when the separate ChatGPT local container cannot. **Do not treat the local container DNS failure as a blocker until this route is checked.**
- The original checkout can contain unfinished changes. Preserve it. Create a separate worktree from the exact verified candidate SHA (for example `/vercel/four-keeps-v20`), then run `npm ci`, TypeScript, Vitest, and Playwright there.
- Read command output with `get_session_command_logs`; a command response alone may omit stdout/stderr. If a long command returns a tool error, check for an already-running process before retrying, to avoid accidentally starting duplicate browser suites.
- This route is a recovery method, not a permanent guarantee of sandbox availability; check its live status and snapshots every time. Never claim execution without evidence.

## Recover execution when GitHub cloning fails
A `Could not resolve host: github.com` error from one shell is **not** proof that all development is blocked.
1. Check whether the environment already has a repository checkout, and verify its remote, branch, clean/dirty state, and HEAD.
2. Try another available executable environment, including an existing development sandbox when accessible. Verify that it can run the project's tests before relying on it.
3. Use the connected GitHub API/connector for branch discovery, file reads, isolated branch creation, and Git object writes if direct clone/network access fails. Connector access is **not** a substitute for actually running tests.
4. Check whether an authorized GitHub Actions runner can execute the exact candidate commit and produce browser artifacts. Never assert local tests or screenshot inspection occurred unless they actually did.
5. Do not claim a Vercel sandbox, GitHub Actions run, or cloud computer is accessible without checking. If no executable test environment exists, report the specific blocker and leave the foundation untouched.

## Development and publication
- Work on an isolated branch. Audit relevant source, tests and rules once, then implement related changes in substantial batches.
- Reuse the recovered environment, dependencies, rules research and fixtures. Add regression tests during implementation and run them together with TypeScript after the batch. Retest affected checks when fixing a concrete failure.
- Use the **full exact-SHA release gate** in RELEASE_CHECKS.md for final regression coverage. Use the authoritative CI run for the full suite and avoid duplicating it locally. Inspect relevant mobile evidence when the UI changes.
- Diagnose any failed release check before retrying. Keep the branch isolated and continue through verification and publication. Resolve routine implementation decisions independently.
- Create only one fresh `verify/*` ref from the finished candidate SHA for a release attempt; inspect full CI, including iPhone Playwright artifacts.
- Publish by protected, non-forced fast-forward only after successful verification; confirm exact-SHA Vercel READY.
- Never use a documentation-only GitHub API edit as evidence that runtime behavior has been implemented.
- If any required check is unavailable or fails, keep changes isolated and report what is done, unverified, and blocked.

## Continuation handoff format
Every new-chat handoff should include:
- Repository, foundation branch, last **verified** foundation SHA (as a reference, not assumed current), and any unfinished branch/SHA.
- The exact user-requested behavior and acceptance tests.
- A directive to read this file and RELEASE_CHECKS.md.
- The environment-recovery sequence above; do **not** stop after the first GitHub DNS failure.
- The release gates and requirement to report actual execution evidence, SHA, deployment, and remaining blockers.

## Current merchant UX intent (v20)
Shopping is conversational: no dedicated Shop/Browse Shop button. Natural browse requests and affirmative replies to merchant offers should open the existing catalog immediately in the same DM turn, without lengthy inventory narration or redundant confirmation. Ordinary conversation must remain ordinary conversation. Preserve the existing catalog, subgroups, full descriptions, magic item rules, cart, checkout, persistence, and campaigns. Validate the Dasahi merchant flow with deterministic tests and iPhone-emulated Playwright before claiming implementation.

### Dynamic battlefield work (2026-11-25)
See [DYNAMIC_BATTLEFIELDS.md](DYNAMIC_BATTLEFIELDS.md) for the isolated candidate, local verification, scope and remaining work. Check live exact-SHA CI and Vercel status before any publication.

### Combat Lab entry-point development (2026-11-25)
A new isolated feat/combat-lab-random-generation candidate provides a seeded **Generate Random Encounter** action in Developer, using the exact same buildSoloEncounter → restorePracticeEncounter → original classic combat UI as the DM's live encounters. No duplicate combat implementation. Test sessions persist separately and do not change live campaigns. Developer legacy controls are collapsed by default, and the map generator shares additional seeded scenery and enemy position variation with production. See DYNAMIC_BATTLEFIELDS.md. Confirm exact SHA and release gates before publication; never assume a prior run suffices.

### Development speed and release process (2026-11-25)
Read the **Faster development and release workflow** section in RELEASE_CHECKS.md before making changes. The production build no longer invokes Vitest. Iterate via one isolated worktree with TypeScript, affected Vitest and iPhone Playwright checks; stress fragile tests and inspect relevant screenshots before one final exact-SHA full CI. Do not duplicate full suites locally or use repeated release candidates for small edits. All gameplay/UI changes still require the complete one-time verify ref, full Vitest, full iPhone browser suite, uploaded artifacts, Vercel READY, and protected foundation fast-forward.

### Embedded practice encounter UX (2026-11-25)
The next Dynamic Battlefields batch scopes disposable random encounters under their real parent adventure without a second saved campaign card, while preserving physical rules and original classic combat. See DYNAMIC_BATTLEFIELDS.md section "Embedded disposable encounters and simplified mobile combat interface". The combat camera uses drag/pinch only; no Fixture/Center/Fit toolbar, no composer refresh, and no hardcoded dummy monster name in hit results. Run full exact-SHA release checks and update the foundation only after green CI and READY.

### Wide battlefields and optional entry selection (2026-11-25)
The shared generator now spreads enemies across physically valid tactical regions, rather than clustering near the entry. Some authored encounters (warehouse/ruins) allow one of three saved pre-initiative player start squares, while roadside retains a fixed entry. All moves after initiative continue through the original engine's 2024 movement rules. See DYNAMIC_BATTLEFIELDS.md. Confirm exact candidate SHA and release checks before publication.


### Phase 3 mobile scene interface (2026-11-26)
- The existing combat interface was approved for a targeted map-first layout evolution. Preserve the ORIGINAL classic combat engine, all physical 2024 rules and gestures, encounter saves and illustrated terrain.
- Foundation at session start: `17dfcf24092971e24ac94d8ee1628bf23dd2c0cc` (verify current HEAD again on continuation). Original dirty sandbox checkout on an unrelated merchant branch remains untouched. Isolated review/development worktree: `/vercel/four-keeps-mobile-scene`, branch `feat/mobile-scene-interface-review`.
- Layout adds a compact initiative row, a battle-map scene host, contextual target distance/cover, a one-line resource row, settings-persisted per-character action favorites, a fixed More / End Turn bar, action choices expanding above it, and collapsed DM narration / Speak. Narrative history excludes system combat-roll entries; initiative detail shows the separate system log.
- Combat Lab now uses a small TEST indicator by initiative; Return to Adventure lives under the hamburger menu. Do not restore any floating map exit banner. The disposable encounter must continue to preserve the saved original adventure.
- Existing map, movement, attack, fixture and action implementations are relocated using `ScenePortal` rather than recreated. The portal must rebind when a scene host is replaced during reload; the map ref must signal camera initialization after mounting or the iPhone viewport/scale will be wrong. Enemy turns retain the map while their existing reaction controls remain available.
- Refer to `docs/MOBILE_SCENE_INTERFACE.md` for design acceptance and validation. Final exact-SHA CI + iPhone artifacts + Vercel READY + protected foundation fast-forward remain mandatory; do not claim publication from a local test.

### Architectural geometry and Combat Lab exit (2026-11-26)
- Removed the warehouse's freestanding door/wall fragment and freestanding window. A perimeter loading door is framed by the western exterior wall and does not obstruct the original interior firing lane. The west map exit stays traversable.
- Ruins have a small walled storeroom with a door and window in connected, accessible wall segments; roadside remains natural outdoor terrain without invented doors.
- `validateGeneratedArchitecture` rejects detached doors/windows (including short wall stubs), and `validateGeneratedBattlefield` applies it to generated maps. This is **generated-only**, not a destructive migration of player-saved or DM-authored legacy combat geometry.
- Combat Lab return is only in hamburger navigation during exploration/combat; a tiny TEST badge with the seed replaces the map banner. Existing saves and camera gestures remain authoritative.
- Regression tests: source `src/game/battlefield.test.ts`; iPhone warehouse door and `Generate Random Encounter` browser cases in `tests/e2e/class-playtests.spec.ts` and `tests/e2e/shell.spec.ts`. Preserve the recurring **approximate chat-capacity warning every five user requests** in continuation prompts.

### Combat Lab starts at full resources (2026-11-26)
- `makeCombatLabEncounter` now creates a fresh isolated copy with current HP restored to max, death saves/conditions/exhaustion cleared, short- and long-rest resource pools and spell slots refreshed, Hit Dice full and active familiars at full HP.
- Training supplies reset **for each newly generated encounter**: 20+ arrows (or a larger existing amount), 2+ daggers and compatible ammunition, previously owned consumables (including empty potion rows and starting-pack supplies), full healer's kit uses/waterskin and owned wand charges. Non-consumable gear and money otherwise stay as-is. The encounter still consumes these normally; replaying/starting another refills again.
- Restocking is a **test-only** operation in the disposable Combat Lab campaign. Never write replenished resources to the real adventure; resuming the same saved test encounter preserves what it has spent. Older saved test encounters are not silently reset on reload.
- Tests: `src/game/combatLab.test.ts`, `src/game/combatLabStorage.test.ts`, and the imported-Rogue iPhone Playwright scenario in `tests/e2e/class-playtests.spec.ts`. Preserve approximate chat-capacity warnings in handoffs.

### Deployment map zoom and visual legibility (2026-11-26)
- `src/app/CombatDeploymentMap.tsx`: placement map allows zoom down to 0.25× (was artificially clamped at 1×) and adds a one-tap Fit overview for the entire battlefield. Zoom controls retain a 44px+ touch target and preserve the examined map position. The existing starting-square rules, no-spent-movement and hidden enemies are unchanged.
- `src/app/battlefieldIllustrations.css`: only the **placement** presentation uses quiet background gradients instead of busy repeated ground-floor textures; walls, doors, cover, objects and markers stay illustrated and legible. Normal combat artwork is preserved. The whole map centers when smaller than its frame.
- Focused iPhone regression `tests/e2e/shell.spec.ts` exercises the 48×40 ruins map, reduced zoom, fit-to-frame, readable highlights, starting-square selection, and source-campaign isolation. Repeat the exact-SHA full release gate before publication.
- Preserve the approximately-every-five-user-requests chat-capacity warning in future handoffs.

### Locked door clarity and Rogue Hide visibility (2026-11-26)
- A closed LOCKED opening must never expose an Open (Free) interaction. `useDuelFixtureAction('pick')` already enforces owned Thieves’ Tools, DC from fixture, Dexterity (Sleight of Hand) d20 and an Action; the selected-object panel now explicitly communicates these requirements, visually disables pick without tools, and shows the roll/result inline. A successfully picked door becomes clearly labeled Unlocked and can then be opened through the existing once-per-turn free interaction. Forcing and striking retain their separate rules.
- `battlefieldOpaqueSightBlocked` uses symmetric center-ray collision with solid walls, pillars, closed doors and trees. Directional offensive cover remains unchanged, but enemy line of sight and Hide checks no longer contradict each other when the other direction measures only partial cover. Undergrowth and resource checks still apply. `combatHideStatus` now uses the same enemy-visibility predicate as `canNighthawkHide`, names actual enemies, and explains Hide eligibility. A dimmed Hide favorite can be tapped on the player's turn for an explanation without spending an action; Confirm remains disabled unless legal.
- Regression: seeded ruins `lab-00000002` with player (10,2), first Goblin Warrior (19,7), second (38,33), Action spent and Bonus Action ready. Unit and iPhone tests cover Hide, lock pick with/without tools, persisted fixture state and action usage.
- Maintain the approximate chat-capacity warning every five user requests in all future Four Keeps continuations.


### Option B combat readability and contextual controls (2026-11-26)
- Approved design: keep the original Phase 3 combat engine, iPhone gesture handling, 2024 mechanics, action/bonus resources, character preferences, saved map geometry and campaign persistence unchanged. The combat map receives quiet theme-matched low-detail backgrounds, while walls/doors/props and selection/pathing art remain distinct. No second combat engine.
- Low-zoom/overview actor pins are fixed-size, colored 16px passive indicators; player/enemy/owl visibility and target selection remain governed by existing rules. Normal-zoom tokens remain.
- Persistent favorite action dock stays as before. Expanded contextual panel caps at 30dvh / 250px; More displays 4 columns of touch-friendly choices; long catalogs scroll within capped panel as needed. Detailed Controls is available with a close button and max 36dvh rather than 72%, preserving forced reaction controls.
- Tests: `tests/e2e/scene-interface.spec.ts` Option B layout, `tests/e2e/shell.spec.ts` theme assertions and existing full iPhone suite. Verify exact-SHA full CI + Vercel READY before a protected non-forced foundation fast-forward.
- Continue to estimate chat capacity approximately every five user requests in future Four Keeps continuation prompts.


### Phase 3 encounter pacing and tactical AI (v27)
- Tactical changes are isolated on feat/v27-encounter-pacing-tactical-ai from foundation 47030a5caccf42e20b04d8b2ab476a0e1950fdef, subject to full verification before publication. Do not publish without exact-SHA full CI, iPhone artifacts, Vercel READY and protected fast-forward.
- Enemy attacks now require directional cover legality and symmetric physical line of sight, including at execution time. Closed doors, walls, pillars and trees cannot be shot through merely because a directional silhouette reports partial cover.
- selectEnemyTactic uses deterministic multi-turn approach distances to physically accessible melee or ranged firing squares. It respects difficult terrain, corner rules, occupying enemies, and locked openings. Enemies can open reachable unlocked doors as their free object interaction but cannot move through them until open.
- Rats close toward melee and retain Pack Tactics. Goblins prefer longer standoff and protected lines; bandits prefer closer crossbow lanes and separation from allies. Hidden foes are searched for at last-known positions, not tracked through walls.
- Warehouse rat zones are closer to the entry than before, retain large map dimensions, separate the two enemies by at least eight grid cells, and preserve seeded ambush/distant variation. Roadside and ruins spawn geography remains unchanged.
- Regression coverage: src/game/tacticalEnemyAI.test.ts (physical sight, long routes, doors, role distances, attack execution and deployment pacing), src/game/battlefield.test.ts (seeded access/variation), and the existing iPhone Combat Lab tests/e2e/shell.spec.ts flow.
- Continue approximate chat-capacity warnings every five user requests.


### Conversation-primary DM exploration scenes (v27 continuation)
- Approved player preference: conversation remains primary. The DM decides when a map materially helps, and a DM-presented map appears automatically without a consent/offer prompt. Players control what their character attempts; presentation never moves characters or triggers combat.
- Added persistent explorationScene to Campaign, normalized and validated with the shared physical Battlefield rules. New src/game/explorationScene.ts handles explicit structured DM sceneAction requests (show/hide/open/close) with stable IDs, matching map templates or constrained custom geometry, reachable unlocked openings, no silent map regeneration, and no hidden enemy tokens.
- Adventure narration still controls exploration. src/app/ExplorationSceneMap.tsx displays the exact saved geometry using the original shared grid and artwork primitives. Player can zoom, fit and select objects; Ask DM drafts a conversational inspection rather than moving/rolling automatically. Maps are not a new combat engine, do not show for ordinary narration, and cannot override DM show/hide authority.
- DM request context now includes a compact scene summary; api/dm.js provides explicit scene instructions and filters scene actions, excluding combat, checks, rests and clarifications. The client validates and commits after the correct DM action ID. Travel hides the old scene but preserves its state; a matching templated combat proposal reuses the exact saved seed and geometry, and the original engine handles combat.
- syncSceneWithCombat can carry fixture states and authoritative position back into the saved scene. Existing classic movement/fixture/exit paths synchronize without changing their rules.
- Tests: src/game/explorationScene.test.ts covers persistence, strict show authorization, reach/locks, world context, travel and matching combat. Full iPhone journey in tests/e2e/class-playtests.spec.ts covers opening, automatic map, object inspection, reload and combat handoff. Screenshot test-results/conversational-exploration-scene.png for review.
- Remaining for future milestones: richer noncombat movement and environmental actions through verified rolls/skill checks, DM-directed mapped NPC interactions, procedural scene art, and sound/fog/elevation. Do not pretend the first phase has implemented those mechanics.
- Keep the every-five-user-requests approximate chat-capacity warning.


### Phase 3 follow-up — verified conversational exploration (2026-11-27)
- Conversation is still the primary interface; the DM chooses when a map is displayed. The existing scene map now lets a player tap an accessible square to draft a movement request, never to move immediately. DM sceneAction move is validated against the actual saved battlefield, including blocked squares, diagonal corners, difficult terrain, and closed/locked doors; only a matching player movement intent authorizes the position update.
- Persistent scene features (clues, traps) are defined only on initial DM show, using stable IDs, known map coordinates and 2024-style DC 10/15/20, with a Perception or Investigation skill. Features start hidden; the DM cannot rewrite or replace them by revisiting the scene. The compact scene context gives the DM the authoritative state.
- The existing server-issued sealed d20 check pipeline supports binding feature discovery via sceneCheck (sceneId, featureId, goal=discover) and disarming discovered adjacent traps via Sleight of Hand + owned Thieves Tools (goal=disarm). Checks are bound to exact recorded DC and skill; failed rolls do not mutate feature status. Success updates saved status only after the verified checkResult. On reload, clues, traps and player position persist.
- Matching combat templates reuse saved geometry and the character's explored square as the starting position; the existing combat engine remains the sole owner of initiative and attack/reaction mechanics.
- Regression coverage: src/game/explorationScene.test.ts, tests/dm-scene-actions.test.ts, existing adventure and check-context tests, and the iPhone-emulated conversation movement + clue discovery + trap disarm journey in tests/e2e/class-playtests.spec.ts. The local browser journey saves test-results/conversational-scene-checks.png.
- NOT YET BUILT: deterministic trap trigger/damage/save effects, advanced environmental puzzles, NPC movement, hidden enemy visibility during exploration, automatic consequences from unsaved narration. Do not claim those are supported. Keep full exact-SHA CI, artifact, READY, protected nonforced fast-forward requirements.
