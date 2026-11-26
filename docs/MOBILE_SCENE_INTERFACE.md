# Phase 3 — mobile scene interface (approved layout)

## Scope
Reorganize existing classic combat presentation around its authoritative battlefield. Do not create a second combat implementation or change rules, physical geometry, campaign persistence, saved cameras, character abilities or actions. Future exploration/NPC contexts may reuse the shell; this batch does not replace existing exploration mechanics.

## iPhone composition
- Header: compact hamburger, title, round and initiative actor icons in order, highlighting the current actor. Tap to reveal full numeric initiative plus **separate** detailed system/roll history.
- Map: fills the available screen between header and bottom controls. The existing illustrated grid, token selection, path preview, movement and opportunity-attack logic, inspectable objects and camera/touch handlers remain the source of truth. A contextual target tag displays the named target, distance and physical cover; no DM-only HP or secret rolls.
- Bottom edge of map: collapsed latest DM narration, new-message indicator and Speak button. Expand narration for a conversation-only transcript; Speak expands the existing DM input (16px iPhone text).
- Footer: compact current/max HP, remaining movement and Action/Bonus/Reaction availability. Character-specific ordered favorites, More and fixed two-tap End Turn. Settings contains all action choices with favorite checkboxes and move up/down; local storage keys are scoped to the character draft ID.
- Tap action to expand original confirmation/choice controls upward above the footer. More exposes every action; move confirmation appears directly above the footer, with opportunity-attack warnings. Detailed controls remain accessible for uncommon states and reactions.
- The keyboard and overlays must not force the battlefield into a nested scrolling page.

## Implementation invariants
- Keep classic map's camera gestures and deterministic movement/attack/event engine.
- Keep the actual saved campaign and disposable Combat Lab encounter isolated.
- During Combat Lab, show a tiny TEST indicator beside the round/initiative row (seed accessible on the badge); offer Return to Adventure in the hamburger navigation, not as a map overlay or hidden-only detailed control. Preserve the original campaign's untouched save.
- Do not reveal secret enemy stats or DM adjudication information.
- During an enemy turn, keep the map mounted but disallow player movement; preserve existing enemy/reaction logic.
- When a scene portal changes host, the original camera must initialize against the mounted viewport. Never leave children in a detached portal DOM node.
- Retain noncombat adventure composer and navigation unchanged.
- Preserve original user agency and improvised DM text input.

## Verification
Focused validation: TypeScript; scene preference unit tests; iPhone Playwright for scene, favorites persistence, initiative, Speak, original warehouse handoff, classic camera and path/attack affordances.
Release only after one complete exact-candidate-SHA GitHub Actions verify run (full Vitest + complete iPhone Chromium suite + artifacts) and matching Vercel READY, then a protected nonforced fast-forward. Failed/older verification does not count.

## Placement map legibility and overview (2026-11-26)
Pre-initiative placement can now zoom below 100% (to 25%) and Fit the whole map on iPhone. Zoom stays centered on the area being examined; Fit centers the overview. The placement-only floor artwork uses reduced-detail, theme-matched colors so walls, doors, props, blue start squares and the gold character marker remain immediately readable. The combat map's original illustrative surface, controls, geometry, target concealment and campaign rules remain unchanged.

## Object checks and concealment feedback (2026-11-26)
The existing selected-object overlay remains, with explicit Locked/Unlocked status. A locked door offers Roll Thieves’ Tools (Action) at its saved lock DC; without the tools it cannot be picked, and a free opening is unavailable. The completed Dexterity (Sleight of Hand) roll and DC appear in the same object panel. Hiding uses an opaque, symmetric wall sight test distinct from attack cover; a spent Action does not prevent a Rogue from using an unused Cunning Action bonus Hide when concealed. Hide favorites may be tapped for a concise eligibility explanation even if the actual action is unavailable. The existing confirm step and authoritative rule checks are preserved.


## Option B map-first clarity batch (2026-11-26)
- Approved direction: contextual, map-first combat. The **active scene only** uses quiet warehouse/ruins gradients and a broad, muted roadside path instead of repeating stone-tile illustrations. Grid geometry, object sprites, cover, doors, token positions, route and selected-square highlights stay authoritative; placement view and noncombat scenery are unchanged.
- At overview/low zoom, player, owl and enemy positions gain clear, noninteractive 16px pins with distinct labels/color; map cells remain the real click/target surfaces and pin labels never disclose DM-hidden HP.
- The existing contextual choices panel stays attached immediately above the persistent favorites bar. Cap its height at about 30dvh / 250px; simple actions take only short rows. More uses four compact columns, scrolling only for long lists or spell/weapon choices. Preserve the existing confirm/cancel behavior and touch-friendly minimum 44px controls.
- The legacy Detailed Controls view is still available for rare states, capped to 36dvh with its own Close control; reactions and mandatory interruptions still appear even if it was otherwise collapsed. Do not remove existing mechanics, change action economy, or create a second battlefield implementation.
- Focused iPhone screenshots and deterministic tests cover scene layout bounds, More action grid, the details close control and the three scene background themes; preserve safe-area, voice/composer, initiative, persistent favorites and camera gestures.
