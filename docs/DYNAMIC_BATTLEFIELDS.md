# Dynamic battlefields — implementation and handoff (2026-11-25)

## Recovery and isolation
- Foundation: feat/clean-app-shell at f3dffeb2149c80a2b4a69442e8d709380063bcb4; exact-SHA Vercel READY deployment dpl_SoJxi21yecexPDEk3JE6tMd3XL3c.
- Recovered named sandbox four-keeps-m1-b2. Original dirty checkout /vercel/four-keeps left intact. Isolated worktree /vercel/four-keeps-dynamic; candidate feat/dynamic-battlefields.
- Candidate commit is the commit containing this document; release verification ref verify/dynamic-battlefields must point to that exact commit. [Release CI](https://github.com/Commodore84/four-keeps/actions?query=branch%3Averify%2Fdynamic-battlefields). Follow RELEASE_CHECKS.md; this document does not authorize publication.

## Implemented
- A: Shared serializable rectangular battlefield data, five-foot cells, physical objects/footprints, collision, difficult terrain, directional sight/cover, direct weapon attack integration. Original classic practice combat interface and surrounding controls remain in use. Legacy saves without physical geometry retain their prior grid and behavior. Physical encounter geometry and actual starting/actor positions survive classic handoff and save reload.
- B: Classic map supports independent dimensions, about ten squares across by default, touch drag, double-tap/hold vertical zoom, pinch/two-finger pan, Center and Fit, persisted camera per encounter, and gentle player-follow with manual gesture grace period.
- C: Seeded warehouse (40x32), roadside (32x60), ruins (48x40) layouts; seeds include environment/campaign/action identity; connectivity checks for starts/enemies/exits, variation across seeds, stable persisted layout. Existing monster roster, XP and contract definitions retained.
- D groundwork: object kind/asset keys and visible grid terrain symbols/colors; no illustrated asset set yet.

## Local verification
- Locked dependency install succeeded in Vercel sandbox; TypeScript check passed.
- First full local unit run: 996 tests across 100 files passed; subsequently added targeted battlefield tests and refinements.
- Final focused unit suite: 174 tests across seven files passed.
- Expanded iPhone 13-emulated Chromium regression: three cases passed (DM warehouse handoff, normal classic warehouse gameplay, legacy mapless warehouse recovery). Warehouse case exercises default readable scale, 1,280 cells, fit, one-handed zoom, pan, camera and geometry persistence, move confirmation and enemy selection.
- Visually inspected actual iPhone warehouse default and fit screenshots; captures in test-results/dynamic-warehouse-iphone.png and test-results/dynamic-warehouse-fit-iphone.png. Original resource strip and map frame retained.
- Full exact-SHA CI and Vercel READY are mandatory before foundation publication; local results are not a substitute.

## Outstanding and design limits
- Current DOM grid has a provisional 65,536-cell safety budget, not a permanent width or height cap. Larger maps should eventually use viewport culling or canvas.
- Cover uses sampled rays and object-kind height/cover profiles. Full 3D elevation, creature cover, all saving-throw interactions, interactive doors/windows and exhaustive spell/reaction integration need follow-up.
- Alternate tactical-engine geometry is compatible, but its camera has not yet received the complete classic-camera feature set. Verify roadside and ruins in live iPhone play, more gesture/edge-follow scenarios, and wider movement/attack regression coverage.
- Generator proves start/exit connectivity, not formal multiple-route diversity or tactical-interest scoring; positions are environment-specific and layouts vary. Explicit DM-provided geometry/positions are honored, but deeper exploration-to-battlefield continuity is outstanding.
- Illustrated reusable assets, subtle grid overlays and rendering performance improvements are next. Fog of war, concealment, advanced visibility, sound, and multi-floor exploration remain explicitly deferred.
- Keep original classic encounter UI, prior saves, and reward/character/inventory mechanics intact. Do not replace the combat interface.

## Follow-up release correction and scenario verification (2026-11-25)
- Exact-SHA verification of candidate 08f540c reported 156/157 iPhone Playwright tests passing; the sole regression was the original companion 20x20 out-of-bounds message. The legacy message was restored without changing dynamic scenario boundaries.
- Added generation validation for non-overlapping starts, at least two cardinal movement options per spawn, and start-to-exit connectivity. Tested 450 deterministic scenario seeds, including JSON save/reload round trips and layout variation.
- Added iPhone-emulated roadside (32x60) and ruins (48x40) browser tests for classic interface preservation, rectangular geometry, camera Fit and reload persistence. Both passed; inspected their normal and fit screenshots. Legacy companion out-of-bounds browser regression passed after correction.
- The follow-up candidate requires a NEW exact-SHA full CI run and Vercel READY before protected publication. Previous failed run 45635161237 does not authorize publication.
