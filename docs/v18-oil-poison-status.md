# Four Keeps v18 — Oil and Basic Poison implementation boundaries

## Ground Oil

Oil spill is an explicit confirmed Utilize action on adjacent level ground. One flask is deducted atomically; a 5-foot square is persisted in the unified encounter. DM-confirmed ignition is an idempotent consumable request. Fire damage uses the existing typed-damage engine, with per-actor per-turn tracking and turn advancement expiration. The UI requires explicit DM ignition confirmation rather than assuming a torch or attack ignites oil. Validate movement, forced movement, end-of-turn damage and expiry in CI before merging.

## Basic Poison ammunition — deferred

The current attack transaction `attackCompanionWithVerifiedStats` consumes ammunition only **after** `attackCompanion` resolves damage, then tracks `ammunitionPendingRecovery`. Existing `basicPoison` stores a single `weaponId` and `expiresRound`, and `basicPoisonWeapon` explicitly excludes Ammunition weapons. Supporting three coated ammunition pieces requires a persisted count per ammunition type and source (legacy arrows vs ledger), authoritative decrement per shot, preservation on miss, expiration after ten rounds, and poison damage on qualifying Piercing/Slashing hit. This must integrate with the same exactly-once attack/inventory transaction and recoverable-ammunition accounting. A separate UI must select compatible owned ammunition and confirm the quantity up to three. Do not silently poison all shots or use the existing one-weapon coating state as ammunition coating.

## Source

SRD 5.2.1 Oil: dousing a 5-foot square is Utilize, ignited oil burns through the end of the corresponding turn two rounds later and deals 5 Fire on entering or ending a turn, at most once per turn. Basic Poison: Bonus Action, up to three pieces of ammunition, extra 1d4 Poison damage on qualifying damage, potency one minute or until damage is dealt.

## Required implementation sequence for poisoned ammunition

1. Define an authoritative `poisonedAmmunition` encounter record with ammunition type, quantity (maximum three), expiry at the corresponding turn one minute later, and a unique application request ID. Do not reuse `basicPoison.weaponId`.
2. On the confirmed Bonus Action, verify equipped ammunition weapon and matching owned ammunition in the ledger or legacy inventory, then atomically consume exactly one vial of Basic Poison. Mark up to three *existing* compatible rounds as coated without manufacturing ammunition.
3. Integrate the coating into `attackCompanionWithVerifiedStats`, where the selected ammunition source is already determined. The selected round must be decremented **on every shot**, including misses; damage rolls for a qualifying hit must use the same validated typed-damage and death-save resolution as the existing single-weapon coating.
4. Move the current split attack-then-inventory-spend into one transactional, rollback-safe operation. A failed inventory write must not leave target HP changed or an ammunition round marked used. Preserve `ammunitionPendingRecovery` without duplicating recoverable coated rounds.
5. Add two-tab stale-state, reload, expiry, misses, multi-shot, zero-stock, resistance/immunity, and critical-hit regression coverage, followed by iPhone UI and browser tests. Only merge once complete CI passes.

The new isolated branch contains a regression test proving unsupported ammunition coating currently rejects without spending arrows or Poison. It is **not** a claim of implemented ammunition coating.
