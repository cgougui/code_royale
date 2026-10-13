# 👑 Code Royale

A browser coding game for kids. Write JavaScript to command the **blue army**,
press **FIGHT!** and watch your fighters battle the **red team**.

- Fighters only see enemies inside their **detection radius**; the team shares vision,
  bushes hide fighters, rocks block movement and sight, and attacking makes noise
- Movement commands: `explore()`, `follow()`, `circle()`, `patrol()`, `hide()`, `escape()`, `wait()`, `moveTo()`
- Fair fights: in regular levels both teams have the same army, only the code differs
  (the boss fight and the endless survival mode are different on purpose)
- Built-in fighting style: melee fighters step in, strike, back off and circle; ranged
  fighters keep their distance and side-step. Target rings and decision icons make
  every fight easy to follow
- 11 levels that teach one idea at a time: exploring, sticking together, kiting, scouting,
  power-ups, special moves, area attacks, ambushes, a boss fight, a final duel and an endless mode
- Stars, unlocks, records and code saved automatically in the browser
- Kid-friendly error messages, autocomplete for the game API, a built-in guide and hints
- "Spy on Red": the red team runs the same API, so kids can read and learn from its code
- A real debugger: pause the battle, pick a fighter and run its code step by step (step, over,
  out, **back**), see every variable change, hover a name to see its value, and set 🔴 breakpoints
  that fast-forward the battle until a fighter reaches that line

## Run it

```bash
docker compose up --build        # → http://localhost:8080
```

or for development:

```bash
npm install
npm run dev                      # → http://localhost:5173
```

## Architecture

```
packages/engine     deterministic simulation + script sandbox   (no DOM)
packages/content    levels, red strategies, API guide           (data)
packages/renderer   canvas renderer + sound                     (no React)
app/domain          pure progress rules, player reducer, playback
app/runtime         browser workers and validated storage
app/hooks           React session state and resource lifetimes
app/features        game controller and page presentation
app/components      reusable UI, editor and arena
app/routes          page composition
```

Dependencies point toward the engine and the pure app domain; `npm run check` enforces the boundaries (per-package typecheck,
import checker, tests including golden replays). Full engineering docs: [docs/](docs/README.md).

```bash
npm run check     # typecheck + architecture rules + tests
npm run balance   # headless difficulty report for every level
```
