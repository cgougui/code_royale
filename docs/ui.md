# Renderer and UI

## Renderer (`@code-royale/renderer`)

`ArenaRenderer.draw(frameA, frameB, alpha, infos, dt, hud, view)` is called every animation frame.

- **Interpolation:** units and projectiles are lerped between two 20 Hz frames, so it renders at display rate.
- **Events → effects:** `handleEvent` turns `GameEvent`s into particles, floating numbers, rings, banners,
  screen shake and sounds (`sfx`, synthesized with Web Audio; no asset files).
- **Layers (bottom → top):** cached terrain (grass, bushes, rocks, walls) · tombstones · items · meteor warnings ·
  **fog of war** · target rings · shadows · fighters · health bars, 👁 and decision icons · projectiles ·
  speech bubbles · hover overlay · particles/text · HUD · banner.
- **Fog of war:** a half-resolution offscreen mask. Each blue fighter clears its sight circle, minus the shadow wedges
  cast by rocks. Red units are drawn only if the frame says `seen`. Toggle: `view.fog`.
- **Readability aids:** target rings (attackers' colour, ×N), decision icons popped when a fighter's `act` changes
  (debounced 0.25 s), `!`/`?` on spotted/lost, hover = sight circle + range + line to target + "doing" label,
  lunge offset on melee swings, see-through units in bushes or smoke.
- Sprites are procedural (`sprites.ts`); `drawUnit` is reused by the UI for portraits.

## Browser runtime (`app/runtime/`)

| File | Role |
| --- | --- |
| `battle.worker.ts` | `toBattleSetup` + `runBattle` in a Web Worker; streams `init`/`frames`/`done`/`compileError` |
| `protocol.ts` | worker message types |
| `battle-run.ts` | `BattleRun`: spawns the worker, buffers frames, finds the final blow (slow-mo), 2 s stuck watchdog |
| `progress-store.ts` | localStorage (`code-royale:v1`), with field validation and graceful fallback for corrupt or unavailable storage |
| `trace.worker.ts` | debugger: `debugBattle` for one request. A **fresh worker per request**: sloppy-mode scripts can leave globals behind, and a replay must start clean like the original battle did |
| `trace-client.ts` | `requestTrace(job, signal)`: promise over the trace worker; abortable, 4 s stuck watchdog |

## Application state (`app/domain/`, `app/hooks/`)

- `domain/progress.ts`: pure star, unlock, record and saved-code rules.
- `domain/player-session.ts`: pure reducer for hydration, edits, level changes and awards.
- `domain/battle-replay.ts`: read-only replay contract and debugger frame/fighter selectors.
- `domain/battle-playback.ts`: countdown/playing/ending/finished phases, interpolation cursor,
  streaming buffers, event delivery, slow motion, quiet seeking and completion notification.
- `hooks/use-player-session.ts`: loads progress, debounces code saves and persists committed progress in effects.
- `hooks/use-battle-session.ts`: owns the active worker, ignores stale callbacks, disposes it on unmount,
  exposes playback controls, and prevents replays from awarding the same battle again.
- `hooks/use-debugger.ts`: trace session state, cancellation, fighter selection and stepping across ticks.
- `hooks/use-arena-playback.ts`: countdown timers and requestAnimationFrame scheduling; translates
  playback updates into renderer and audio calls. Cleans up timers and animation on unmount.

## React app (`app/`)

- `routes/home.tsx`: composes `features/game/GameScreen.tsx`.
- `features/game/use-game-controller.ts`: connects player, battle and debugger use cases and audio settings.
- `features/game/GameScreen.tsx`: page layout, modals and editor access; `BattleControls.tsx` renders playback controls.
- `components/Arena.tsx`: canvas sizing, pointer input and overlays; delegates playback to `useArenaPlayback`.
- `components/CodeEditor.tsx`: CodeMirror 6 with custom theme, API autocomplete (from `API_GROUPS`),
  syntax and runtime-error lint markers, Ctrl+Enter to fight.
- `components/DebugPanel.tsx`: the debugger (replaces the console while debugging): fighter chips, time slider
  and ±1 tick, Restart/Back/Step/Over/Out/Continue (F7/F11/F10/Shift+F11/F8), variables tree with changed
  values flashing, "order so far", output, and "what the fighter knows" (`me`, `enemies`…).
  The editor shows breakpoints (gutter / F9, kept in CodeMirror state so they follow edits), highlights the
  statement about to run, shows values on hover, and is read-only while debugging. The arena freezes on the
  traced moment, spotlights the fighter (`ViewOptions.focus`), and a click picks another blue fighter.
  Entry points: **Debug** in the battle bar, 🐞 on console lines, "Step through it" on runtime errors.
  Debugging needs the code the battle was fought with (`BattleRun.code`); after an edit, FIGHT again.
- `MissionCard`, `ConsolePanel`, `ResultOverlay` (stars, stats, next/replay/spy), `LevelMap`, `GuideDrawer`
  (commands, fighters, rules, JS basics), `Dialogs` (welcome, spy on red).

UI state never feeds back into the simulation: the only inputs to a battle are `levelId`, `blueCode` and `seed`.
