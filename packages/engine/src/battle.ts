/**
 * Battle: the orchestrator. Owns the World and the ScriptRunner and runs the
 * fixed-step simulation loop. Each step:
 *
 *   items → waves → vision → scripts decide → orders → collisions
 *   → projectiles → blasts → pick-ups → timers → end check → snapshot
 */
import type { BattleResult, BattleSetup, CompileError, Frame, ItemKind, ItemSnap, LogEntry, ProjectileSnap, UnitInfo } from "./protocol";
import { ARENA_H, ARENA_W, DT, TICKS_PER_SECOND } from "./rules";
import { ScriptRunner } from "./scripting/brains";
import { moveProjectiles, resolveBlasts } from "./world/combat";
import { dropScheduledItems, pickupItems } from "./world/items";
import { separate } from "./world/movement";
import { carryOutOrders } from "./world/orders";
import { infoOf, World } from "./world/state";
import { computeVision } from "./world/vision";
import { endlessWave } from "./world/waves";

export class Battle {
  readonly world: World;
  readonly scripts: ScriptRunner;
  result: BattleResult | null = null;
  /** Current wave number (1 = the starting red army). */
  wave = 1;
  private waveTimer = -1;

  constructor(private readonly setup: BattleSetup) {
    this.world = new World({ seed: setup.seed, bushes: setup.bushes, rocks: setup.rocks, items: setup.items });
    this.scripts = new ScriptRunner(this.world, setup.seed);
    for (const s of setup.blue) this.world.spawn(s, "blue");
    for (const s of setup.red) this.world.spawn(s, "red");
    computeVision(this.world, false);
  }

  /** Compiles both scripts. Returns the blue compile error if there is one. */
  prepare(): CompileError | null {
    return this.scripts.load(this.setup.blueCode, this.setup.redCode);
  }

  get tick() {
    return this.world.tick;
  }

  /** Player-facing messages produced since the last call (log(), errors, warnings). */
  drainLogs(): LogEntry[] {
    return this.scripts.logs.splice(0);
  }

  /** The starting positions, before anybody moves. */
  initialFrame(): Frame {
    return this.snapshot();
  }

  unitInfos(): UnitInfo[] {
    return this.world.units.map(infoOf);
  }

  /** Advances the simulation by one tick (1/20 s) and returns what happened. */
  step(): Frame {
    const w = this.world;
    w.events = [];
    dropScheduledItems(w, w.tick * DT);
    if (this.waveTimer > 0 && --this.waveTimer === 0) this.spawnWave();

    // Who can see whom? Scripts only learn about enemies their team has spotted.
    computeVision(w, true);

    for (const u of w.units) {
      u.intent = { k: "idle" };
      u.specialReq = null;
    }
    this.scripts.run("blue");
    this.scripts.run("red");
    this.scripts.checkBlind();

    for (const u of w.units) if (u.alive) carryOutOrders(w, u);
    separate(w);
    moveProjectiles(w);
    resolveBlasts(w);
    pickupItems(w);

    for (const u of w.units) {
      if (!u.alive) continue;
      u.cooldown -= DT;
      u.specialCd = Math.max(0, u.specialCd - DT);
      u.rageT = Math.max(0, u.rageT - DT);
      u.frenzyT = Math.max(0, u.frenzyT - DT);
      u.revealT = Math.max(0, u.revealT - DT);
      if (u.vanishT > 0 && (u.vanishT -= DT) <= 0) w.events.push({ k: "smoke", id: u.id, x: u.x, y: u.y });
      if (u.sayT > 0 && (u.sayT -= DT) <= 0) u.say = undefined;
    }

    w.tick++;
    this.checkEnd();
    return this.snapshot();
  }

  private snapshot(): Frame {
    const w = this.world;
    const units = w.units
      .filter((u) => u.alive)
      .map((u) => ({
        id: u.id,
        x: Math.round(u.x * 10) / 10,
        y: Math.round(u.y * 10) / 10,
        hp: Math.max(0, Math.round(u.hp)),
        facing: Math.round(u.facing * 100) / 100,
        moving: u.moving,
        alive: true,
        say: u.say,
        raging: u.rageT > 0 || u.frenzyT > 0,
        shield: Math.round(u.shield),
        specialReady: u.specialCd <= 0,
        seen: u.seen,
        hidden: w.isHidden(u),
        vanish: u.vanishT > 0,
        act: u.act,
        target: u.targetId,
      }));
    const projectiles: ProjectileSnap[] = w.projectiles.map((p) => ({
      id: p.id,
      kind: p.kind,
      team: p.team,
      x: Math.round(p.x),
      y: Math.round(p.y),
      angle: Math.round(p.angle * 100) / 100,
    }));
    const items: ItemSnap[] = w.items.map((i) => ({ id: i.id, kind: i.kind, x: i.x, y: i.y }));
    return { tick: w.tick, units, projectiles, items, events: w.events };
  }

  private checkEnd() {
    const w = this.world;
    const blueAlive = w.units.filter((u) => u.alive && u.team === "blue").length;
    const redAlive = w.units.filter((u) => u.alive && u.team === "red").length;
    const time = w.tick * DT;
    let winner: BattleResult["winner"] | null = null;
    if (blueAlive === 0) winner = "red";
    else if (redAlive === 0 && this.waveTimer < 0) {
      if (this.setup.endless || (this.setup.waves && this.wave <= this.setup.waves.length)) {
        this.waveTimer = TICKS_PER_SECOND * 2;
        // A breather between waves: survivors patch themselves up.
        for (const u of w.units) {
          if (u.alive && u.team === "blue") {
            const amount = Math.min(u.maxHp - u.hp, u.maxHp * 0.5);
            if (amount > 0) {
              u.hp += amount;
              w.events.push({ k: "heal", id: u.id, amount: Math.round(amount), x: u.x, y: u.y });
            }
          }
        }
      } else winner = "blue";
    }
    if (!winner && time >= this.setup.timeLimit) winner = "draw";
    if (!winner) return;
    this.result = {
      winner,
      time: Math.round(time * 10) / 10,
      blueAlive,
      blueTotal: w.totals.blue,
      redAlive,
      redTotal: w.totals.red,
      redKilled: w.redKilled,
      damageDealt: Math.round(w.damageDealt),
      // Waves fully cleared.
      wave: winner === "blue" ? this.wave : this.wave - 1,
      said: this.scripts.blueSaid,
    };
  }

  private spawnWave() {
    const w = this.world;
    this.waveTimer = -1;
    const n = ++this.wave;
    const specs = this.setup.endless ? endlessWave(n, w.rng) : this.setup.waves![n - 2];
    for (const s of specs) w.spawn(s, "red", true);
    if (this.setup.endless && n % 3 === 0) {
      // Reinforcements: a fallen blue fighter comes back.
      const fallen = w.units.find((u) => !u.alive && u.team === "blue" && !u.revived);
      if (fallen) {
        fallen.revived = true;
        const u = w.spawn({ type: fallen.type, x: 110, y: ARENA_H / 2, name: fallen.name }, "blue", true);
        u.index = fallen.index;
        w.totals.blue--;
      }
    }
    w.events.push({ k: "wave", n });
    if (this.setup.endless && n % 2 === 0) {
      const kinds: ItemKind[] = ["potion", "rage", "shield"];
      w.items.push({
        id: w.newId(),
        kind: kinds[Math.floor(w.rng() * 3)],
        x: ARENA_W / 2 + (w.rng() - 0.5) * 300,
        y: ARENA_H / 2 + (w.rng() - 0.5) * 300,
      });
    }
  }
}
