# Design decisions

Short records of the choices that shape the codebase. Newest last.

| # | Decision | Why | Consequence |
| --- | --- | --- | --- |
| 1 | **Static SPA, no backend** (React Router 7 `ssr: false`, nginx) | Requirement; zero ops | Progress lives in localStorage, per browser |
| 2 | **Simulate the whole battle in a Web Worker, then replay** | Player code can't freeze the page; infinite loops are killed by a watchdog; replay/speed/skip are free | Battles are fully computed ahead; playback is a cursor over frames |
| 3 | **Deterministic fixed-step engine** (20 Hz, seeded RNG, separate script RNG) | Replays, tests, golden snapshots, balancing by simulation | No wall-clock or `Math.random` in the engine |
| 4 | **Scripts give intents, systems act** (`me.*` records an `Intent`) | Kids' code can't break invariants; "last order wins" is easy to explain; enables built-in behaviours | Every command is an `Intent` kind handled in `orders.ts` |
| 5 | **acorn pre-parse + `new Function` with explicit globals** | Line-accurate, friendly syntax errors; small API surface | Not a security sandbox by itself; the worker is the boundary |
| 6 | **Detection radius + shared team vision + fog of war** | Makes scouting, grouping, hiding and escaping meaningful; RTS convention | `enemies` holds spotted enemies only; starter code must `explore()` |
| 7 | **Bushes hide, rocks block sight, attacking makes noise** | Brawl Stars / RTS conventions kids know; creates ambush and counterplay | Vision rules live in one system (`vision.ts`) |
| 8 | **Healer removed, scout added** | Healing made fights slow and opaque; scouting fits the vision design | Potions are the only healing (plus between waves) |
| 9 | **Mirror armies; difficulty comes from red code** | Fairness is obvious; teaches that *code* wins; red code is readable and spy-able | Only boss/survival levels differ, and they must say so (`note`, enforced by test) |
| 10 | **Built-in fighting style** (melee rhythm, ranged sidestep, knockback, look-around) | Simple code should look good; fights stay readable instead of blobs | Small DPS-neutral movement; balance re-tuned |
| 11 | **Readability overlays** (target rings, decision icons, `!`/`?`, 👁, hover lines) | Kids must see what their code decided and why a fight went that way | Frames carry `act`, `target`, `seen`, `hidden` |
| 12 | **Workspace packages with enforced boundaries** (engine / content / renderer / app) | Engine and strategies testable and reusable without UI; prevents erosion | Per-package tsconfig, import checker, check gate in Docker build |
| 13 | **Golden replay tests** | Any behavioural change becomes a visible, reviewed diff | Intentional rule changes require `vitest -u` |
| 14 | **Debugger = deterministic replay + recorded trace** (not pausing live code) | Scripts run synchronously inside a tick and can't be paused; replay is cheap and exact; a recording allows stepping *back* | Instrumented scripts must behave exactly like the originals (parity tests); one fresh worker per trace request |
| 15 | **Pure app rules + browser adapters + React hooks + page feature** | Progress, playback and worker lifetimes were mixed with page layout; pure transitions make race conditions and replay behaviour testable | Reducers contain no persistence; hooks dispose resources; playback emits effects; components consume a read-only replay contract; dependency rules enforce app boundaries |
| 16 | **Renderer composes dedicated layers** | Terrain caching, visibility masks, effects and overlays have independent state and change for different reasons | Public renderer API and draw order stay stable; modules own their specific caches/state and share the same animation RNG |
| 17 | **Language-neutral core; text at the edges** (engine messages are codes, renderer words are injected, content splits specs from per-language text, UI uses i18next) | Kids learn best in their own language; translations must never change a battle | Adding a language = one content folder + one JSON file, guided by TypeScript and checked by tests (same keys, placeholders, plural forms, and code token for token). See [i18n.md](i18n.md) |
