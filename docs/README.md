# Code Royale: engineering docs

A browser game where kids write JavaScript to command an army. No backend: a static SPA served by nginx.

| Doc | What's in it |
| --- | --- |
| [architecture.md](architecture.md) | Layers, dependency rules and how they are enforced, runtime data flow |
| [engine.md](engine.md) | Simulation loop, systems, game rules, determinism, the script sandbox and API |
| [content.md](content.md) | Levels, built-in strategies, difficulty design and balancing |
| [ui.md](ui.md) | Renderer, browser runtime (worker, playback, storage) and React UI |
| [testing.md](testing.md) | Check suite, unit tests, golden replays, balance tool |
| [decisions.md](decisions.md) | Key design decisions and why |

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # typecheck (per package) + architecture rules + tests
npm run balance      # headless difficulty report for every level
docker compose up --build   # production image, http://localhost:8080
```

## Repository map

```
packages/
  engine/     @code-royale/engine    deterministic simulation + script sandbox (no DOM)
  content/    @code-royale/content   levels, red strategies, API guide text (data)
  renderer/   @code-royale/renderer  Canvas 2D renderer + Web Audio effects (no React)
app/
  domain/     pure progress rules, player reducer, replay/playback contracts
  runtime/    workers, watchdogs, validated browser storage
  hooks/      React session state and browser resource lifetimes
  components/ reusable UI, editor, canvas sizing/input
  features/   game controller and page presentation
  routes/     React Router page composition
tools/        balance report, architecture checker
docs/         this documentation
```

Stack: TypeScript 5.9, React 19, React Router 7 (SPA mode), Mantine 9, CodeMirror 6, Vite 7, Vitest 5, acorn, nginx.
