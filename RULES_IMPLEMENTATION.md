# Level-one recovery rule references

This batch implements the 2024 rules, using the published
[D&D Beyond Rules Glossary](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary#LongRest)
and [2024 class descriptions](https://www.dndbeyond.com/sources/dnd/br-2024/character-classes).

Implementation decisions:

- `playerRecovery.ts` handles single-class level-one imported characters. It
  requires a safe, completed rest and positive starting HP. It blocks active or
  unsettled encounters and pending checks. It never invents Hit Die results.
- Short rests spend the class's Hit Die with Constitution, healing at least one
  HP per spent die and respecting the saved maximum. Long rests restore all HP
  and spent Hit Dice. Neither rest restores spent inventory or awards XP.
- Long rests normally take eight hours. The player can explicitly use the saved
  Elf species' Trance to take four hours. Sixteen hours must pass after the prior
  long-rest completion before another can begin; approved waiting is recorded
  separately from the rest itself.
- Fighter Second Wind and Barbarian Rage recover one use per short rest. Other
  level-one pools recover on long rest. Pact Magic slots recover on either rest;
  ordinary class slots recover on long rest. Wizard Arcane Recovery is an opt-in
  short-rest choice recovering one slot at level one, once until a long rest.
- Magic Initiate's free spell use is tracked independently of class spell slots
  and resets on long rest. Its chosen spell and casting ability are retained.
- A known numeric Exhaustion level is reduced by one on long rest. Other
  conditions are retained. Old saves with only a coarse Exhaustion condition
  retain it because its level is unknown.

The original reviewed character draft is stored as `characterBuild`. It preserves
class choices, expertise/masteries, fighting style/order, all spell selections,
spellbook, invocations, origin casting ability, both equipped weapons, purchased
gear, ability generation, rules preferences and identity/portrait. It is a
snapshot, not a reference to the editable draft. Forecasts remain plans, not
active class features. Older saves without a snapshot still load; unknown past
choices are not reconstructed or granted retroactively.

The rest controls record completed, uninterrupted rests. They do not simulate
sleep, danger, food, pursuit, or a running rest that is interrupted. For an
interrupted long rest, the DM can separately confirm any qualifying short rest;
resumed-long-rest interruption accounting remains manual. Temporary ability-score
and maximum-HP reductions have no separate model yet and are not inferred from
the original draft. Rest-driven spell preparation changes and mastery swaps are
not automated. Legacy identity-free Nighthawk controls retain their previous
behavior and are not silently migrated to this module.
