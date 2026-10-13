# 👑 Code Royale

A browser coding game for kids. Write JavaScript to command the **blue army**,
press **FIGHT!** and watch your fighters battle the **red team**.

- 10 levels that teach one idea at a time: targeting, `if`/`else`, kiting, healing,
  power-ups, special moves, area attacks, a boss fight, a final duel and an endless mode
- Stars, unlocks, records and code saved automatically in the browser
- Kid-friendly error messages, autocomplete for the game API, a built-in guide and hints
- "Spy on Red": the red team runs the same API, so kids can read and learn from its code

## Run it

```bash
docker compose up --build        # → http://localhost:8080
```

or for development:

```bash
npm install
npm run dev                      # → http://localhost:5173
```

## How it works

| Path | What it does |
| --- | --- |
| `app/game/sim.ts` | Deterministic battle simulation (20 ticks/s) and the `me` API scripts use |
| `app/game/battle.worker.ts` | Runs a whole battle in a Web Worker so an infinite loop can't freeze the page |
| `app/game/runner.ts` | Talks to the worker, buffers frames, detects stuck code |
| `app/game/render/` | Canvas renderer: sprites, particles, HUD (no image assets) |
| `app/game/levels.ts` | Campaign levels, star goals, hints and the red team's code |
| `app/game/audio.ts` | Synthesized sound effects (Web Audio, no files) |
| `app/components/` | Editor (CodeMirror), arena, console, map, guide, dialogs |

React Router v7 runs in SPA mode (`ssr: false`); the Docker image serves the static
build with nginx.

## Balancing levels

`npm run balance` simulates every level with a few strategies (from the starter code
to a "pro" script) and prints who wins. Run it after changing unit stats or levels.
