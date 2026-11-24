# Phase 1 — Inventory and Equipment

Status as of November 24, 2026: in progress. The isolated branch started from verified GitHub foundation head `84694c1b6b6bf03236295b2292a6cb6011db4fa9`. The original sandbox checkout and its uncommitted merchant changes were preserved. Recovery worktree: `/vercel/four-keeps-phase1`.

Rules reference: [Wizards of the Coast SRD 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf). Implementation status below describes repository evidence, with tests called out separately.

| Area | Current evidence | Open acceptance work |
| --- | --- | --- |
| Weapons | Catalog has damage, properties and mastery. Unified combat derives bonuses from owned equipped weapons and class training. Imported Rogue uses verified Finesse or Ranged attacks for Sneak Attack. | Equip and unequip through the player UI, hand restrictions, property and mastery enforcement, combat path parity. |
| Armor and shields | Builder and unified combat have separate armor math. Unified combat still falls back to saved sheet AC when no armor is equipped. | Runtime equip and unequip, unarmored and shield AC, training, Dexterity cap, Strength penalties and Stealth. |
| Ammunition | Shop checkout enforces full packs. Canonical and legacy ammunition names resolve in verified attacks. Verified Rogue Sneak Attack uses the same expenditure transaction. Existing poison handling stayed covered by regression tests. | Verify actual browser purchase and reload, supplier order handling, loading, and SRD post-combat recovery across all paths. |
| Carrying capacity | Currency, Strength-based capacity, legacy supply fallback and pack projection exist. Bought sling bullets now weigh the same before and after purchase. | Verify action consequences, legacy entries and the rest of the projection matrix. |
| Equipment packs | Existing merchant grants constituent items. | Audit character creation, all pack contents, and constituent use and consumption. |
| Tools and adventuring gear | Existing consumable actions and equipment catalog. | Tool proficiency and contextual checks, DM integration and player interface. |
| Magic items | Existing catalog and selected consumable actions. | Attunement eligibility, limits, effects, charges, recharge and explicit DM adjudication. |
| Inventory interface | Existing imported character sheet has inventory and carrying load. | Compact actionable inventory, categories, full descriptions and persistent navigation. |
| DM integration | Existing contextual merchant and consumable actions. | Ownership and equipment context, safe natural-language use of supported items and confirmation for adjudication. |
| Persistence | Existing campaign ledger and loadout fields. | New state migration, reload, repeat-action and consistency coverage. |

## Evidence

- Focused Vitest run passed 201 tests across six files on the first ammunition batch.
- TypeScript passed after correcting checkout review references to the shared pack step.
- Browser verification, full release verification, Vercel READY and publication remain open.
