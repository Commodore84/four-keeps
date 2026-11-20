# Four Keeps v18 — Oil and Basic Poison implementation boundaries

## Ground Oil

Oil spill is an explicit confirmed Utilize action on adjacent level ground. One flask is deducted atomically; a 5-foot square is persisted in the unified encounter. DM-confirmed ignition is an idempotent consumable request. Fire damage uses the existing typed-damage engine, with per-actor per-turn tracking and turn advancement expiration. The UI requires explicit DM ignition confirmation rather than assuming a torch or attack ignites oil. Validate movement, forced movement, end-of-turn damage and expiry in CI before merging.

## Basic Poison ammunition — deferred

The current attack transaction `attackCompanionWithVerifiedStats` consumes ammunition only **after** `attackCompanion` resolves damage, then tracks `ammunitionPendingRecovery`. Existing `basicPoison` stores a single `weaponId` and `expiresRound`, and `basicPoisonWeapon` explicitly excludes Ammunition weapons. Supporting three coated ammunition pieces requires a persisted count per ammunition type and source (legacy arrows vs ledger), authoritative decrement per shot, preservation on miss, expiration after ten rounds, and poison damage on qualifying Piercing/Slashing hit. This must integrate with the same exactly-once attack/inventory transaction and recoverable-ammunition accounting. A separate UI must select compatible owned ammunition and confirm the quantity up to three. Do not silently poison all shots or use the existing one-weapon coating state as ammunition coating.

## Source

SRD 5.2.1 Oil: dousing a 5-foot square is Utilize, ignited oil burns through the end of the corresponding turn two rounds later and deals 5 Fire on entering or ending a turn, at most once per turn. Basic Poison: Bonus Action, up to three pieces of ammunition, extra 1d4 Poison damage on qualifying damage, potency one minute or until damage is dealt.
