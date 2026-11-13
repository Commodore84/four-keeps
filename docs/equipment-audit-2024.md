# Four Keeps — 2024 equipment reference audit

Source of truth: [D&D Beyond 2024 Free Rules — Equipment](https://www.dndbeyond.com/sources/dnd/br-2024/equipment) and [SRD 5.2.1](https://www.dndbeyond.com/srd), Wizards of the Coast, CC BY 4.0 for SRD content.

The canonical source is `src/game/officialEquipment2024.ts`. Prices are **integer copper pieces**; the UI converts to decimal GP. The source includes **182 individual catalog records**: 38 weapons, 12 armor suits, 1 shield, 89 adventuring gear/focus/pack entries, 5 ammunition types, and 37 tools and tool variants. The catalog includes the standard healing potion (50 GP); it is not a blanket price list for every magic item.

Ammunition is represented per projectile where integer copper permits (e.g. arrows at 5 CP each = 1 GP per 20). Sling bullets are an exception: the official price is 4 CP for 20, so the canonical item is a 20-bullet pack with a `packQuantity` of 20. Merchants must not offer an invented fractional-copper unit price.

The existing catalog had 106 entries. Existing records with matching IDs now resolve to the canonical source for names, price, weight, weapon damage/properties/mastery and armor statistics. Notable changes include classifying Healer's Kit as gear, adding missing equipment, and correcting source data for armor, tool variants and ammunition. Canonical weights include Dart 0.25 lb., Mirror 0.5 lb., Potion of Healing 0.5 lb. and Sack 0.5 lb.

**Legacy compatibility:** ten existing IDs remain available to read saved campaigns and class/background equipment packages, even though they are not distinct entries in the cited equipment tables: `holy-symbol`, `druidic-focus-mistletoe`, `spellbook`, `traveler-s-clothes`, `fine-clothes`, `gaming-set`, `musical-instrument`, `artisan-s-tools`, `crossbow-bolts`, and `sling-bullets`. Some are legitimate 2024 class items or aliases for official table entries, but their original identifiers are retained for migration safety. New merchant catalogs should use only `OFFICIAL_EQUIPMENT_2024` entries, not those generic placeholders.

Merchant stock remains a separate per-location choice. Merchant prices reference `ITEM_BY_ID` (the canonical catalog) and any discounts must be explicitly approved and applied by the deterministic transaction engine. This audit does not automatically add 182 items to the Frontier Village store.

This audit covers the official equipment chapter and its tool variants. It does not claim to enumerate all magic items, vehicles, mounts, lifestyle expenses, or services; those require separate authoritative datasets and economic systems.
