# Content (`@code-royale/content`)

Everything that makes the game a game, as typed data. No logic beyond small layout helpers.

```
src/
  types.ts          Level, Strategy, StarGoal, Hint
  levels/
    01-training.ts … 11-endless.ts   one file per level
    layout.ts       column(), mirror(), inBush(), center(); star goals win / survivors(n) / flawless
    index.ts        LEVELS (campaign order), levelById, starsFor
  strategies/       one file per built-in script (red brains + blue starter)
  api-docs.ts       kid-facing API reference (autocomplete + guide)
  setup.ts          toBattleSetup(level, blueCode, seed) → engine BattleSetup
```

## Level anatomy

`id, num, title, tagline, story, learn, newApi[]` (mission card) · `blue, red` armies · `bushes, rocks, items`
· `waves | endless` · `redStrategy` · `timeLimit` · `stars` (3 goals) · `hints[]` (progressive, optional code
that can be inserted) · `note` (required when the armies differ).

## Difficulty design

- **Fair fights.** Regular levels are mirror matches (`mirror(blueArmy)`). A test enforces this unless the level
  has a `note` (the Ogre boss and Endless survival are the exceptions, and the UI shows why).
- **The red strategy is the difficulty knob.** Each red brain is readable code with one deliberate weakness that
  the level's lesson exploits (e.g. *The Pack* moves together but never focuses one target; *The March* never
  uses specials). Players can read it in the game ("Spy on Red").
- **Targets** (from `npm run balance`): the starter code wins level 1; from level 2 on, the starter code earns
  0–2 stars; the level's own hint code earns 3 stars; level 10 (Red Champion) needs genuinely clever code.

| # | Level | Red strategy | Lesson / new API |
| --- | --- | --- | --- |
| 1 | Training Grounds | sleepy (scattered, wait until close) | `nearestEnemy`, `attack`, `explore`, if/else |
| 2 | Stick Together | pack (follows leader, no focus) | `index`, `follow`, `allies` |
| 3 | Arrows Away | archer hunters (archers never flee) | `type`, `distanceTo`, `escape` |
| 4 | Scout Ahead | forest ambush (hide in bushes) | shared vision, `circle`, `sight` |
| 5 | Treasure Hunt | treasure hunters | `items`, `nearestItem`, `moveTo` |
| 6 | Special Moves | march (no specials) | `specialReady`, `special`, `enemiesNear` |
| 7 | Fire & Fury | march (tight bunch) | area attacks, `special(x, y)`, loops |
| 8 | Ambush! | march (walks in the open) | `hide`, `isHidden`, `inBush` |
| 9 | The Ogre King | ogre king (boss, 2 waves) | dodge `enemy.specialReady`, rocks as cover |
| 10 | Code Royale | champion | everything, `team` memory |
| 11 | Endless Horde | endless horde (waves) | survival; record of waves cleared |

## Adding a level

1. Create `levels/NN-name.ts` exporting a `Level` (use `layout.ts` helpers; reuse or add a strategy).
2. Append it to `LEVELS` in `levels/index.ts`.
3. `npm run balance -- <id>` until the starter/hint/advanced results match the targets above.
4. `npm test`. A new golden snapshot is written; commit it.

Unlocking is sequential (≥ 1 star on the previous level); progress is keyed by level `id`, so never rename ids.
