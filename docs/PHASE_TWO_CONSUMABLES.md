# Phase 2 — Consumables

Rules: [SRD 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), Magic Items, Equipment and Spells. Keep the [gear audit](consumable-srd-5.2.1-audit.md) for the underlying gear inventory.

| Area | Implementation |
| --- | --- |
| Potions | Healing potencies, drinking and adjacent administration as a Bonus Action, HP limits and saved use IDs. Potion of Resistance uses the DM-identified damage type, halves applicable tracked damage and expires after one game hour. Giant Strength potions raise effective Strength for attacks, checks, saves, armor and capacity for an hour. Reusing the same potion effect replaces its timer. |
| Poison and gear | Retains weapon coatings, poisoned ammunition, Cunning Strike, Antitoxin, burn, recovery and stabilization systems. Thrown gear follows the verified single-attack encounter flow at all supported Rogue levels. An anchored Hunting Trap requires a verified save and damage roll, limits movement to its square and uses an Athletics check to free a creature. |
| Scrolls | Verify class list and rank, including Arcane Trickster and higher-rank casting checks. A failed check expends the scroll. Magic Missile and Web resolve in combat. Generic legacy scroll rows require DM confirmation of their inscription. |
| Wands | Individual copies each track charges and dawn. The held copy supplies Magic Missile or Web. Web attunement belongs to its chosen copy. Destroying the selected copy preserves the others. Generic discard or sale removes the last listed copies first. |
| Effects and DM | Save resistance and Web state, apply it to damage, movement and conditions, and track game time and concentration. The DM receives effects, charges and actions. Explicit Adventure potion requests use the existing confirmation and save transactions. |
| iPhone | Player controls for resistance, scroll prerequisites, encounter targets, Web, trap rolls and per-copy charge status. The acceptance scenario exercises natural potion use, inventory, effect status, per-copy charges and real reload. |

## Boundaries and Phase 3 dependencies

- Scroll automation verifies supported rank-zero through rank-two catalog spells. Spells beyond the verified catalog, casting outside a tracked scene, other item effects and conditional spell outcomes require DM adjudication. Magic Missile uses verified Shield protections.
- Web uses a tactical grid footprint, concentration, entry and turn-start saves, movement cost and Athletics escape. Vertical anchoring, burning Web and overlapping hazard adjudication remain with the DM.
- The shared encounter retains its single primary attack flow. Legacy scripted combat has its existing item scope. Broader spell and encounter automation should reuse the verified item spell and game-clock paths.
- Phase 3 can extend the verified spell registry and encounter triggers, broaden typed effects and migrate generic scrolls to individual inscriptions at acquisition.

Release evidence comes from the exact-SHA workflow and its iPhone artifacts. Keep the candidate isolated until the checks in [RELEASE_CHECKS.md](RELEASE_CHECKS.md) succeed.

Development verification passed TypeScript, 103 focused Vitest checks on the amended batch and the combined iPhone consumables reload scenario. The branch’s final test counts, screenshot and publication evidence are tracked by the release run.
