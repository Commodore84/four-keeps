# Phase 1 — Inventory and Equipment

This checklist follows the Phase 1 candidate on `feat/phase-one-inventory`. It started from foundation `84694c1b6b6bf03236295b2292a6cb6011db4fa9`. The original checkout in the named Vercel sandbox remains available with its uncommitted merchant changes. The implementation worktree is `/vercel/four-keeps-phase1`.

Rules reference: [Wizards of the Coast SRD 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf). The public [2024 equipment rules](https://www.dndbeyond.com/sources/dnd/br-2024/equipment) and the catalog audit supply the equipment tables.

| Area | Implementation and acceptance evidence |
| --- | --- |
| Weapons | Owned weapon slots, proficiency, Finesse ability selection by modifier, Heavy penalties, Reach, ranged and thrown limits, damage type, two-handed and Versatile grip, and Light attacks with or without Nick. Verified attacks apply trained Vex, Sap, Slow and Graze. Topple, Push and Cleave accept verified targets, saves or movement inputs. Rogue Sneak Attack validates the weapon, positioning and expends projectiles or thrown weapons. Dedicated mastery tests cover hit, miss, expiry and repeat-action cases. |
| Armor and shields | Equip and unequip on Player. Derived AC handles unarmored defenses, armor group Dexterity limits and shield training. Low Strength affects Speed. Armor penalties carry through supported checks, saves, attacks, Stealth and spellcasting. Hands are shared among shield, weapons and supported wands. |
| Ammunition | Full SRD packs at merchants and suppliers. Ledger stores individual pieces, supports legacy names, and consumes one per verified applicable strike including misses. Poison is applied to owned compatible ammunition. One post-combat search takes a game minute and recovers half of expended ammunition rounded down. Legacy prototype reconciliation remains compatible. |
| Carrying capacity | Individual item weights, coin counts, pack expansion, Strength and Powerful Build. Cart weight and actual sling ammunition weight agree. Checkout and supplier collection enforce capacity. Imported characters above capacity see the warning and cannot move until their load is reduced. |
| Equipment packs | Builder, merchant purchase and supplier collection expand packs into their canonical parts once. Constituent gear has its own quantity and can be consumed through supported equipment actions. |
| Tools and gear | DM checks use owned tools and training, apply proficiency once, preserve skill Expertise, grant Advantage for skill and tool proficiency together and apply Rogue Reliable Talent where appropriate. Adventure use covers explicit light, ration and antitoxin requests with a player confirmation before the existing inventory transaction. Additional contextual gear effects use DM adjudication. |
| Magic items | Owned, held or worn, and attuned states are distinct. Cloak and Ring of Protection require a confirmed Short Rest and improve AC and saves when worn. Reviewed Wand of Web requires a Spellcaster. Both supported wands store charges, validate expenditure, resolve last-charge loss and support rolled dawn recharge. Wand spell effects remain pending DM adjudication. |
| Inventory and persistence | The portrait Player inventory shows categories, descriptions, equipment facts, item quantities and weights. It supports equip, unequip, offhand selection and confirmed discard with quantity validation. The section picker stays available while scrolling. Playwright verifies equipment and Adventure candle consumption survive real reloads. |
| DM integration | Narration sees current owned, equipped, attuned and trained-tool state. Game transactions enforce confirmation, ownership, quantities and prerequisites. Uncertain checks and unsupported effects are adjudicated in conversation. |

## Current boundaries

- The deterministic magic automation covers the protection wearables and the charge ledgers of the Wand of Magic Missiles and Wand of Web. Item-specific magic outside this set, wand spell outcomes and multiple identical charge-bearing items use DM adjudication. These effects are labelled in the inventory.
- The shared encounter currently resolves a single primary attack per Attack action with Light and mastery follow-ups. Ammunition and action use are enforced on that path. Class features that grant multiple primary attacks are outside the verified Phase 1 engine.
- Unknown legacy or magic-item weights remain marked for DM confirmation. Quest and terrain consequences of equipment use remain with the DM.
- The release workflow runs full Playwright in iPhone 13 Chromium emulation when CI is set.

## Verification and release

- First ammunition batch: 201 focused Vitest tests passed.
- Armor checkpoint: TypeScript, production build and 934 Vitest tests passed. The iPhone screenshot was inspected for the section picker, equipped state and inventory weight.
- Broader equipment checkpoint: TypeScript, production build and 941 Vitest tests passed. Full iPhone Playwright passed 145 of 148 tests and identified three Rogue dagger range regressions. The throws were then resolved with the correct range and inventory expenditure.
- The three Rogue regressions and both new iPhone persistence scenarios subsequently passed together.
- The final release requires a full re-run on the finished tree, exact-SHA GitHub Actions evidence and exact-SHA Vercel READY before a protected foundation fast-forward. Verify the foundation and playtest alias after publication.
