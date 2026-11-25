# Four Keeps v19 item-details and consumables audit

Verified starting branch: feat/clean-app-shell at 65dd90e55de82afd59db5e323dc836dc84094d7d.

## Existing merchant rules
`src/game/merchantItemDetails.ts` provides SRD-derived descriptions and facts; the merchant storefront previously displayed the full description on every card, making the inventory cumbersome on iPhone. v19 places the detailed explanation in a native expandable disclosure without changing the source text, pricing, inventory, or checkout logic.

## Existing magic-item rules
`src/game/magicWishlist.ts` combines SRD and additional 2024 DMG entries. `src/game/magicItemUseDescriptions.ts` supplies use explanations and Alchemy Jug quantities. v19 adds an expandable provenance/requirements panel; it does not pretend that non-SRD descriptions are licensed SRD text. Detailed descriptions remain visible for existing search and wish-list use.

## Consumable engine status
`src/game/consumables.ts` already supports confirmed and idempotent use of Acid, Alchemist's Fire, Holy Water, Oil, Antitoxin, Basic Poison, Healer's Kit, Ball Bearings, Caltrops, Rations, Waterskin, Rope, Candle, Lamp and Torch, with encounter and inventory checks. See `docs/consumable-srd-5.2.1-audit.md` for per-item limitations and deferred interactions.

## Gaps and safe scope
- No new consumable effect is included in this v19 commit. The existing action engine requires authoritative target, action, and roll state; fabricating missing interactions would risk deterministic combat and inventory.
- Additional consumable implementations should be developed in a separate, mechanically complete batch with deterministic unit and browser tests.
- A full per-item manual accuracy review of all imported non-SRD magic items remains open.
- Expanded descriptions preserve existing mechanics; no claims of complete 2024 DMG coverage are made.

## Regression gates
Full GitHub Actions build, Vitest and Playwright must pass before any fast-forward of feat/clean-app-shell. The production Vercel deployment must be verified by exact commit SHA.
