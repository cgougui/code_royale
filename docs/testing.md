# Testing and quality gates

```bash
npm run check   # = typecheck + check:arch + test   (also runs in the Docker build)
```

| Gate | Command | Catches |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | type errors; DOM use in engine/content/app domain (separate tsconfigs) |
| Architecture | `npm run check:arch` | forbidden dependencies within packages and app responsibilities; deep imports and paths leaving a package |
| Unit tests | `npm test` | engine, content, app domain, browser adapters and dependency rules (Vitest, Node) |
| Balance | `npm run balance [levelId]` | difficulty regressions (manual review) |

## Engine tests (`packages/engine/test`)

Self-contained scenarios built from tiny `BattleSetup`s (no content dependency):

- **determinism:** same seed → identical frames; different seed → different; script `random()` doesn't perturb the world.
- **vision:** detection radius, bush detection range, scout eyes, rocks block line of sight, scripts only see spotted
  enemies, shared team vision.
- **scripting:** syntax error lines, the "never closed" message, compile errors block the battle, runtime errors are
  reported once with their line, the blind-fighters nudge, the friendly-fire warning.
- **orders:** `moveTo`, `explore`, `escape`, `circle` distance, `hide`, rock avoidance, melee fights resolve.
- **debugger:** instrumented scripts produce byte-identical battles (a corpus of tricky JavaScript), lines are
  preserved, traces (variables, TDZ, order so far, output, crash line), call depth and step over/out/back,
  endless loops stopped, breakpoint search, and the replay matches the real battle.

## Content tests (`packages/content/test`)

- Unique ids and sequential numbers; every strategy and every hint snippet parses.
- Mirror-army rule (unless `note`).
- Every level runs with the starter code without the red script throwing.
- The debugger can trace every level's red script (played as blue).
- **Golden replays:** an FNV-1a hash of every frame and log of each level played by the starter code (seed 7),
  snapshotted. Any change to rules, systems or levels changes them. Review the diff, then `npx vitest run -u`.

## Balance tool (`tools/balance.ts`)

Plays every level with reference scripts (`naive` = starter, `group`, `scouthint`, `ambush`, `pro`, `champion`)
over three seeds and prints winner, stars, survivors and time. Use it after any rule or level change;
targets are listed in [content.md](content.md).

## Application and architecture tests

`app/test` checks behaviour without a browser:

- Playback: countdown, pause, speed, interpolation, event delivery, streaming stalls, final-blow
  slow motion, quiet backward seeking, skip and single completion notification.
- Player state: switching levels before the debounce expires preserves both drafts; stars and
  endless records never regress; invalid saved fields are repaired; storage failures remain harmless.
- Worker adapters: buffer frames, complete/terminate, detect stuck scripts, refresh watchdogs,
  ignore messages after cancellation, and abort or time out trace requests with resource cleanup.

`tools/test` exercises the architecture parser and dependency rules, including side-effect imports,
inline import types, worker URLs, aliases and sibling paths sharing a directory prefix.

## Refactor safety

The package split was verified with frame fingerprints recorded before the refactor: all 22 reference battles
(11 levels × 2 strategies) were byte-identical after it. The golden replay tests keep that guarantee.

The app/renderer separation was also compared against the working tree at the start of that refactor.
Canvas command fingerprints matched across all 11 levels with the starter strategy and seed 7
(up to 600 ticks per level, alternating fog, interpolation, hover/focus, confetti, banners and reset).
The renderer comparison is a one-time refactor check, separate from the permanent test suite.
