# Engine (`@code-royale/engine`)

Deterministic, fixed-step battle simulation plus the sandbox that runs player scripts.

```
src/
  index.ts          public API (the only entry point)
  protocol.ts       data contract (see architecture.md)
  rules.ts          arena size, tick rate, vision constants
  units.ts          fighter catalog (UNIT_STATS), names
  battle.ts         Battle: orchestrates one tick
  headless.ts       runBattle(): run to completion, stream frames
  debug.ts          debugBattle(): replay + trace one fighter's script; stepTarget()
  math/             geometry, seeded RNG (mulberry32)
  world/            state + systems (plain functions over World)
    state.ts        World, Unit, Intent, spawn, lookups
    vision.ts       detection, line of sight, shared vision, explored grid
    movement.ts     walk + rock avoidance, flee/escape, orbit, explore, collisions
    combat.ts       attacks, footwork, specials, damage, projectiles, meteors
    items.ts        scheduled items, pick-ups
    orders.ts       Intent → systems (one call per fighter per tick)
    waves.ts        endless-mode wave generator
  scripting/
    sandbox.ts      syntax check (acorn), compile, error lines, friendly messages
    api.ts          the `me` object and read-only views given to scripts
    brains.ts       ScriptRunner: runs scripts, collects logs/errors/warnings
    format.ts       value formatting for log() / say()
    instrument.ts   debugger: rewrites a script to report each statement + its variables
    inspect.ts      debugger: any value → plain `Inspected` tree (never calls getters)
```

## The tick (20 per second)

`Battle.step()`:

1. drop scheduled items · spawn next wave if due
2. **vision**: recompute what each team sees (emits `spotted` / `lost`)
3. reset intents → **blue scripts** → **red scripts** (each fighter sets an `Intent`)
4. **orders**: each fighter carries out its intent (move/attack/special…)
5. collisions (fighters and rocks) → projectiles → meteors → pick-ups
6. timers (cooldowns, rage, smoke, speech) → `tick++` → end check → snapshot `Frame`

Scripts decide, systems act. A script never mutates the world: `me.attack(x)` only records an intent,
and the last order given in a tick wins.

## Determinism

- One seeded RNG for the world (`World.rng`); scripts get a **separate** seeded `random()`, so script
  randomness can never shift the simulation's sequence.
- No wall-clock time, no `Math.random` in the engine, a fixed iteration order.
- Same `BattleSetup` (including `seed`) ⇒ byte-identical frames. This is enforced by tests and golden replays.

## Game rules (summary)

| Topic | Rule |
| --- | --- |
| Arena | 960×600, 28 px wall; rocks block movement **and** sight; bushes hide |
| Vision | each unit has `sight` (knight 170, archer 230, scout 300…); team vision is shared; scripts only receive spotted enemies |
| Bushes | hidden units are detected only within 90 (scouts: 170) |
| Noise | attacking reveals you for 0.8 s and makes you visible from 1.5× sight; it also cancels the scout's smoke bomb |
| Melee rhythm | step in, strike (lunge), back off by `range + 14`, circle, repeat |
| Ranged footwork | hold 75% of range and sidestep between shots |
| Hits | small knockback (bigger on special hits) |
| Fleeing | 80% speed, slides along walls/rocks |
| Items | potion +60 HP, rage ×2 damage for 8 s, shield absorbs 60 |
| End | one team wiped out (or all waves cleared) or `timeLimit` reached (draw) |

Unit stats and specials are in `units.ts`; global constants are in `rules.ts`.

## Script sandbox

- `checkSyntax` (acorn) runs before compiling, to give line-accurate, kid-friendly syntax errors.
- `compile` uses `new Function(...SCRIPT_GLOBALS, code)`. A script can reach only those parameters:
  `me, enemies, allies, items, time, arena, team, log, distance, random`.
- Runtime errors are caught per fighter per tick, deduplicated, mapped to a line number (engine-calibrated
  stack parsing) and rephrased (`friendlyRuntime`) as a language-neutral `Message` (code + params); the app words it
  in the player's language (see [i18n.md](i18n.md)).
- **Security boundary:** scripts run in the host JS realm. The app therefore runs the engine inside a
  Web Worker (no DOM access, killable). The engine itself has no timeout; it can't, being synchronous.
- Built-in (red) script errors don't reach the player. They're collected in `ScriptRunner.redErrors`,
  and tests assert it stays empty.

## Debugger (`debug.ts`)

Step-by-step execution with variable inspection, built on determinism instead of pausing live code:

1. **Replay.** `debugBattle(setup, { tick, unitId })` rebuilds the battle from the same `BattleSetup`
   and steps it with the normal scripts up to `tick`.
2. **Instrument.** `instrument()` parses the script (acorn, with a small scope analysis) and inserts text,
   never line breaks, so lines and error lines don't move:
   `__cr.s(point, [()=>a, ()=>b])` before each statement (getters for every variable in scope,
   so TDZ shows as "not created yet"), `__cr.i()`/`__cr.o()` around function bodies (call depth, in
   `try/finally`), `__cr.l()` in loop bodies. A statement in a single position (`if (x) foo()`) is wrapped
   in braces; a statement in a list isn't (so `let` keeps its scope); a label's loop is never wrapped.
3. **Record.** During that one tick, `ScriptRunner.interceptor` runs the traced fighter with the instrumented
   script. Each step stores its location, call depth, variables (`inspect`), the order given so far
   (`describeOrder`), and the output count. The trace ends with an `end` or `error` step.

- **Breakpoints:** a cheap `Probe` (no snapshots) runs every blue fighter's instrumented script tick by tick
  from `tick` until one reaches a breakpoint line; that tick is then replayed and recorded.
- **Navigation** is pure data: `stepTarget(steps, i, "into" | "over" | "out" | "back" | "continue")`
  returns a step index, or `null` when it leaves the tick (the UI then traces the next/previous tick).
- **Same behaviour guaranteed:** hooks only read variables, and `inspect` never calls getters. Tests run whole
  battles with instrumented scripts and require identical frames (closures, labels, switch, hoisting, classes,
  destructuring, try/finally, errors…), and every built-in strategy must be traceable.
- **Endless loops** in the traced tick become an `error` step after 1,000,000 loop rounds instead of freezing
  (only the first 2,000 steps are recorded, the script keeps running).
- The interceptor is `null` in normal battles: `runBattle` and golden replays are unaffected.

## Script API

The API that scripts see is `scripting/api.ts`. Its kid-facing documentation is `content/src/api-docs.ts`,
which drives both editor autocomplete and the in-game guide.

| Group | Members |
| --- | --- |
| Move | `moveTo`, `explore`, `follow`, `circle`, `patrol`, `hide`, `escape`, `moveAwayFrom`, `wait`/`stop` |
| Fight | `attack`, `special`, `say` |
| Spot | `nearestEnemy`, `weakestEnemy`, `strongestEnemy`, `enemiesNear`, `canSee`, `distanceTo`, `inRange` |
| Friends/things | `nearestAlly`, `weakestAlly`, `nearestItem`, `nearestBush`, `alliesNear` |
| Self | `type, health, maxHealth, x, y, sight, range, isSpotted, isHidden, inBush, specialReady, specialCooldown, index, name, memory…` |
| Globals | `enemies` (spotted only), `allies`, `items`, `time`, `arena` (+`bushes`, `rocks`), `team`, `log`, `distance`, `random` |

Other fighters are frozen `UnitView` snapshots, so mutating them has no effect.

## Extending

- **New command:** add a method to `Me` that sets an `Intent` → handle it in `world/orders.ts`
  (+ `ACT_OF` for the UI icon) → document it in `content/src/api-docs.ts` → add a test in `test/orders.test.ts`.
- **New unit type:** add it to `UnitType` (protocol) and `UNIT_STATS` (units) → its special in `combat.useSpecial`
  → sprite in `renderer/src/sprites.ts`.
- **New rule constant:** `rules.ts`. Expect golden replays to change; update them deliberately (`npx vitest run -u`).
