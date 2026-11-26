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
