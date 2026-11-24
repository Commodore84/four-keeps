# Phase 1 — Inventory and Equipment

Status as of November 24, 2026: in progress. The isolated branch started from verified GitHub foundation head `84694c1b6b6bf03236295b2292a6cb6011db4fa9`. The original sandbox checkout and its uncommitted merchant changes were preserved. Recovery worktree: `/vercel/four-keeps-phase1`.

Rules reference: [Wizards of the Coast SRD 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf). Implementation status below describes repository evidence, with tests called out separately.

| Area | Current evidence | Open acceptance work |
| --- | --- | --- |
| Weapons | Catalog has damage, properties and mastery. Unified combat derives bonuses from owned equipped weapons and class training. Imported Rogue uses verified Finesse or Ranged attacks for Sneak Attack. | Player sheet equip and unequip, verified weapon reach, range, Heavy penalties, damage types and hand restrictions are implemented. Light, Versatile and remaining Weapon Mastery effects are open. |
| Armor and shields | Builder and unified combat have separate armor math. Unified combat still falls back to saved sheet AC when no armor is equipped. | Player-sheet equip and unequip, unarmored and shield AC, and tested training and Strength penalties added. Audit all combat, spellcasting and Stealth entry points. |
| Ammunition | Shop checkout enforces full packs. Canonical and legacy ammunition names resolve in verified attacks. Verified Rogue Sneak Attack uses the same expenditure transaction. Existing poison handling stayed covered by regression tests. | Supplier orders use full packs, and imported encounters can search once to recover half of expended ammunition. Legacy combat keeps its existing recovery. Loading with additional attacks and mixed ammunition recovery need review. |
| Carrying capacity | Currency, Strength-based capacity, legacy supply fallback and pack projection exist. Bought sling bullets now weigh the same before and after purchase. | Over-capacity imported characters cannot move. Review legacy entries and the remaining projection matrix. |
| Equipment packs | Builder imports, merchant purchases and supplier collections grant pack contents. | Audit character creation, all pack contents, and constituent use and consumption. |
| Tools and adventuring gear | Existing consumable and catalog actions plus owned tool checks with proficiency, expertise and Reliable Talent. DM adjudicates the result. | Broaden contextual interactions and verify catalog tool descriptions. |
| Magic items | Protection ring and cloak have persisted worn and attuned states and deterministic AC and save bonuses. Two reviewed wands track charges, dawn recharge, hand use, and Spellcaster attunement for the Wand of Web. | Wand spell effects and other unsupported magic effects require DM adjudication. Review more items and per-copy state for duplicate wands. |
| Inventory interface | Imported sheet groups owned gear, shows weight and descriptions, and allows equipment changes outside combat. | Compact actionable inventory, categories, full descriptions and persistent navigation. |
| DM integration | Existing contextual merchant and consumable actions. | DM context now has owned, equipped, attuned and tool training evidence. Explicit Adventure requests to light a lamp, torch or candle, eat one ration or take antitoxin require player confirmation and reuse the existing campaign transaction. Expand supported intents as appropriate. |
| Persistence | Existing campaign ledger and loadout fields. | New state migration, reload, repeat-action and consistency coverage. |

## Evidence

- Focused Vitest run passed 201 tests across six files on the first ammunition batch.
- TypeScript passed after correcting checkout review references to the shared pack step.
- iPhone 13 Chromium passed the conversational purchase reload, Dasahi merchant handoff, and equipment reload scenarios. Inspected the equipment screenshot for portrait layout and equipped state.
- The armor checkpoint passed TypeScript, production Vite build, and full Vitest (934 tests). The latest batch is being verified.
- Full release verification, Vercel READY and publication remain open.
