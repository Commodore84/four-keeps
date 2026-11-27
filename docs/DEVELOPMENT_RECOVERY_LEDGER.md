# Four Keeps development recovery ledger
Audit date: 2026-11-27. Repository: `Commodore84/four-keeps`.
Foundation at audit start: `546a53b1cc3e816c39f179d02073ec0c3ef78566`.
This document distinguishes **present functionality**, **unpublished candidates**, **unreconciled old drafts**, and **intentionally deferred work**. Branch/session labels are development sessions, not product versions.

## Recovery evidence and release gate
- Local isolated puzzle commit `38e428c42c40db9d0deec6bb1761eb1bceb8b0d9`, parent `546a53b`; reconstructed in GitHub as `604f7894ef57368c96e411626dfc9f0a6dbff945`. Their trees match exactly: `559a3cf590cb43bd51c68376d60b0dd0bb1d25fb`.
- The reconstruction implements persisted clue-gated mechanisms, physical object shifts, trapped doors, saved trap consequences, and failed-disarm triggers. The existing conversation-first DM and original combat engine remain authoritative.
- Local evidence on the isolated candidate: TypeScript, production build, 33 targeted Vitest cases, and three iPhone Playwright journeys passed. Original iPhone screenshot inspection exposed an unintended tall empty map frame on small scenes; the follow-up fixes its height with an inline override and asserts the 3-row scene renders at 156px.
- **Only** full exact-SHA GitHub Actions success (build, all Vitest, all iPhone Chromium Playwright, artifact upload), relevant screenshot inspection, exact-SHA Vercel READY, and non-forced protected fast-forward authorize foundation publication. Do not use older candidate CI for a changed SHA.
- Persistent Vercel sandbox: `four-keeps-m1-b2`; original dirty checkout `/vercel/four-keeps` intentionally preserved. Isolated validation checkout `/vercel/four-keeps-recovery-audit`. Local sandbox Git can fetch but currently lacks push credentials; GitHub connector writes require blob/tree verification.

## Worktree inventory (snapshot)
83 local worktrees examined; 20 have tracked working-tree changes, 9 include non-build untracked paths, and 54 heads have commits not on the then-current foundation ancestry. The last count is **not** 54 missing features: historical branches may have been rebased, cherry-picked differently or replaced. No legacy worktree was discarded or mass-merged.

| Area | Evidence in current code | Old work to retain / disposition |
| --- | --- | --- |
| Carry capacity, imports, packs, saves | `src/game/carryingCapacity.ts`, `equipmentPacks.ts`, `characterImport.ts`, `storage.ts`; current code includes creation equipment weights, pack expansion, legacy migration and capacity projections. Tests: `carryingCapacity.test.ts`, `equipmentPacks.cart.test.ts`, `character-import.test.ts`. | Dirty v21, v26, v27, v28 worktrees contain earlier iterations. Not byte-identical to current source; do not transplant. Reconcile a specific failing regression before reusing an old hunk. |
| Merchants and cart | `src/app/MerchantShop.tsx` includes Buy/Sell, ordinary resale, owned/equipped/cart-via-pack states, max-affordable quantity, weight preview and compact checkout; `frontierShop.ts` retains stock and transactional rules. | Dirty root merchant invitation, `/tmp/four-keeps-packs`, v29 and v30 worktrees are historical. `merchantCategories.ts` exists in current code. Verify actual behavior through `frontierShop.test.ts` and iPhone shop scenarios; no blind merge. |
| Combat, placement, camera | Original classic engine remains; `CombatDeploymentMap.tsx`, `TacticalBattlefield.tsx`, `tacticalEnemyAI.ts`, battlefield and iPhone tests are present. | Old classic-view, combat-unified, deployment-map, center-camera, tactical and illustrated worktrees contain nonidentical drafts. Preserve, compare against current gestures and original engine, never reintroduce a second engine. |
| Mobile and recovery | Shop touch controls, owned scroll casting, campaign save feedback, and `PlayerRestPanel.tsx` with recovery details exist. | v31–v38 session commits and v34 rest changes reflect earlier development. v35 and v36-recovery local dirty diffs reverse-apply cleanly to current; others are not byte-identical. Check UX behavior before transferring code. |
| Exploration puzzles | This recovery candidate: scene mechanisms, door traps, failed disarm, object shifts and compact map test. | Release the verified candidate; preserve its original local commit as recovery evidence. |

## Remaining verification or future scope
- Finish the current candidate's exact-SHA release gate; validate screenshots for map compactness and the DM interaction flow. Document the tested SHA and deployment in the continuation handoff after publication.
- If a player-visible regression is found in merchant/cart/capacity or combat UI, isolate it with a test against the **current foundation**, then selectively port the required fix; historical patch mismatch alone is not evidence of a missing feature.
- Defer enemy AI refinements at the player's request, fog of war, procedural scene artwork, mapped NPC movement, NPC trap triggering, complex multi-stage puzzles, broad trap conditions, and complete resistance/vulnerability handling. These are not claimed implemented.
- Do not remove stale branches/worktrees or restore deprecated controls without an explicit cleanup decision. Keep `CONTINUATION.md` and `RELEASE_CHECKS.md` authoritative, with approximate capacity warnings every five user requests.

## v29 environmental encounter follow-up (2026-11-27)
- The v28 recovered candidate was fully verified and foundation-fast-forwarded at `de69848f6275b1b97265e8b7fa244c8bd3c927e1` (GitHub Actions run `46041912657`; 1,112 Vitest and 179 iPhone Playwright tests passed; matching Vercel foundation deployment READY).
- v29 adds reusable saved scene-local keys, bounded notch rotations, acyclic multi-mechanism prerequisites and a final latch unlocking a separate physical door action. Completion is driven by authoritative checks/actions, not narration. The tested Sun Temple scene and iPhone regression are in the new release candidate.
- Larger-item Strength/Athletics, transportable cross-scene quest items, mapped NPC movement and generated room artwork remain explicitly deferred; do not recover historical worktrees indiscriminately.

## v30 heavy environment interactions (2026-11-27)
- On a new isolated branch atop verified v29 foundation `dfc90a449fbf2520b81bc9a9a89e783b4eef6347`, added persistent `statue` geometry and scene-authored Strength/Athletics checks for moving 1x1 heavy objects and lifting locked gates. Sealed result tokens bind a specific object, optional one-cell target, and canonical skill DC. Failed checks and unreachable/blocked/over-capacity actions leave the scene unchanged. Trapped gates use saved trap saves without bypass.
- Regression source: `explorationHeavyObjects.test.ts`, API scene check tests, iPhone Heavy Gate Hall test. Feature worktree and all historical dirty work remain preserved. Publication is forbidden without full exact-SHA CI and READY.
