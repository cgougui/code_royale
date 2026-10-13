import { ARENA_H, ARENA_W, BLUE_NAMES, DT, ITEM_RADIUS, RED_NAMES, TICKS_PER_SECOND, UNIT_STATS, WALL } from "./constants";
import { makeRng } from "./rng";
import { compile, errorLine, formatValue, friendlyRuntime, type Brain } from "./script";
import type {
  BattleResult,
  Frame,
  GameEvent,
  ItemKind,
  ItemSnap,
  ItemSpawnSpec,
  LogEntry,
  ProjectileKind,
  ProjectileSnap,
  SpawnSpec,
  Team,
  UnitInfo,
  UnitStats,
  UnitType,
} from "./types";

export interface BattleSetup {
  blue: SpawnSpec[];
  red: SpawnSpec[];
  blueCode: string;
  redCode: string;
  items?: ItemSpawnSpec[];
  timeLimit: number;
  /** Extra red waves that arrive when the previous one is defeated. */
  waves?: SpawnSpec[][];
  /** Endless waves, generated on the fly. */
  endless?: boolean;
  seed: number;
}

type Intent =
  | { k: "idle" }
  | { k: "attack"; target: number }
  | { k: "heal"; target: number }
  | { k: "move"; x: number; y: number }
  | { k: "flee"; x: number; y: number };

interface Unit {
  id: number;
  type: UnitType;
  team: Team;
  name: string;
  stats: UnitStats;
  index: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  facing: number;
  cooldown: number;
  specialCd: number;
  rageT: number;
  frenzyT: number;
  shield: number;
  moving: boolean;
  alive: boolean;
  say?: string;
  sayT: number;
  memory: Record<string, unknown>;
  intent: Intent;
  revived?: boolean;
  specialReq: { target?: number; x?: number; y?: number } | null;
}

interface Projectile {
  id: number;
  kind: ProjectileKind;
  team: Team;
  owner: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  target?: number;
  damage: number;
  splash?: number;
  hits?: Set<number>;
  life: number;
}

interface Item {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
}

interface PendingBlast {
  ticks: number;
  x: number;
  y: number;
  r: number;
  damage: number;
  team: Team;
  rage: boolean;
}

const MAX_LOGS = 400;

/** What a script sees when it looks at a unit. */
export interface UnitView {
  readonly id: number;
  readonly type: UnitType;
  readonly team: Team;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly specialReady: boolean;
  readonly isRaging: boolean;
  readonly hasShield: boolean;
}

type Thing = { x: number; y: number; id?: number } | null | undefined;

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampX(x: number, r: number) {
  return Math.max(WALL + r, Math.min(ARENA_W - WALL - r, x));
}
function clampY(y: number, r: number) {
  return Math.max(WALL + r, Math.min(ARENA_H - WALL - r, y));
}

export class Battle {
  tick = 0;
  units: Unit[] = [];
  byId = new Map<number, Unit>();
  projectiles: Projectile[] = [];
  items: Item[] = [];
  blasts: PendingBlast[] = [];
  events: GameEvent[] = [];
  logs: LogEntry[] = [];
  result: BattleResult | null = null;
  wave = 1;
  waveTimer = -1;
  private nextId = 1;
  private rng: () => number;
  private scriptRng: () => number;
  private brains: Partial<Record<Team, Brain>> = {};
  private teamMemory: Record<Team, Record<string, unknown>> = { blue: {}, red: {} };
  private seenErrors = new Set<string>();
  private logCount = 0;
  private itemQueue: ItemSpawnSpec[];
  private damageDealt = 0;
  private healingDone = 0;
  private redKilled = 0;
  private totals = { blue: 0, red: 0 };
  private currentUnit: Unit | null = null;
  private blueSaid = false;
  private warnedOnce = new Set<string>();

  constructor(private setup: BattleSetup) {
    this.rng = makeRng(setup.seed);
    this.scriptRng = makeRng(setup.seed ^ 0x9e3779b9);
    this.itemQueue = [...(setup.items ?? [])].sort((a, b) => a.at - b.at);
    for (const s of setup.blue) this.spawn(s, "blue");
    for (const s of setup.red) this.spawn(s, "red");
  }

  /** Compiles both scripts. Returns the blue compile error if there is one. */
  prepare(): { message: string; line?: number; col?: number } | null {
    const blue = compile(this.setup.blueCode);
    if (blue.error) return blue.error;
    this.brains.blue = blue.brain;
    const red = compile(this.setup.redCode);
    if (red.error) throw new Error(`Red script broken: ${red.error.message} (line ${red.error.line})`);
    this.brains.red = red.brain;
    return null;
  }

  /** The starting positions, before anybody moves. */
  initialFrame(): Frame {
    return this.snapshot();
  }

  unitInfos(): UnitInfo[] {
    return this.units.map(infoOf);
  }

  private spawn(s: SpawnSpec, team: Team, emit = false) {
    const stats = UNIT_STATS[s.type];
    const names = team === "blue" ? BLUE_NAMES : RED_NAMES;
    const count = this.units.filter((u) => u.team === team).length;
    const u: Unit = {
      id: this.nextId++,
      type: s.type,
      team,
      name: s.name ?? names[count % names.length] + (count >= names.length ? ` ${Math.floor(count / names.length) + 1}` : ""),
      stats,
      index: count,
      x: s.x,
      y: s.y,
      hp: stats.hp,
      maxHp: stats.hp,
      radius: stats.radius,
      facing: team === "blue" ? 0 : Math.PI,
      cooldown: 0.3 + this.rng() * 0.3,
      specialCd: stats.special.cooldown * 0.5,
      rageT: 0,
      frenzyT: 0,
      shield: 0,
      moving: false,
      alive: true,
      sayT: 0,
      memory: {},
      intent: { k: "idle" },
      specialReq: null,
    };
    this.units.push(u);
    this.byId.set(u.id, u);
    this.totals[team]++;
    if (emit) this.events.push({ k: "spawn", unit: infoOf(u), x: u.x, y: u.y });
    return u;
  }

  // ---------------------------------------------------------------- main loop

  step(): Frame {
    this.events = [];
    const time = this.tick * DT;

    // Items appear on schedule.
    while (this.itemQueue.length && this.itemQueue[0].at <= time) {
      const s = this.itemQueue.shift()!;
      this.items.push({ id: this.nextId++, kind: s.kind, x: s.x, y: s.y });
    }

    // Waves.
    if (this.waveTimer > 0 && --this.waveTimer === 0) this.spawnWave();

    // Each team's script decides what every fighter does.
    for (const u of this.units) {
      u.intent = { k: "idle" };
      u.specialReq = null;
    }
    this.runBrain("blue");
    this.runBrain("red");

    // Resolve actions.
    for (const u of this.units) if (u.alive) this.act(u);
    this.separate();
    this.moveProjectiles();
    this.resolveBlasts();
    this.pickupItems();

    for (const u of this.units) {
      if (!u.alive) continue;
      u.cooldown -= DT;
      u.specialCd = Math.max(0, u.specialCd - DT);
      u.rageT = Math.max(0, u.rageT - DT);
      u.frenzyT = Math.max(0, u.frenzyT - DT);
      if (u.sayT > 0 && (u.sayT -= DT) <= 0) u.say = undefined;
    }

    this.tick++;
    this.checkEnd();
    return this.snapshot();
  }

  private snapshot(): Frame {
    const units = this.units
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
      }));
    const projectiles: ProjectileSnap[] = this.projectiles.map((p) => ({
      id: p.id,
      kind: p.kind,
      team: p.team,
      x: Math.round(p.x),
      y: Math.round(p.y),
      angle: Math.round(p.angle * 100) / 100,
    }));
    const items: ItemSnap[] = this.items.map((i) => ({ id: i.id, kind: i.kind, x: i.x, y: i.y }));
    return { tick: this.tick, units, projectiles, items, events: this.events };
  }

  private checkEnd() {
    const blueAlive = this.units.filter((u) => u.alive && u.team === "blue").length;
    const redAlive = this.units.filter((u) => u.alive && u.team === "red").length;
    const time = this.tick * DT;
    let winner: BattleResult["winner"] | null = null;
    if (blueAlive === 0) winner = "red";
    else if (redAlive === 0 && this.waveTimer < 0) {
      if (this.setup.endless || (this.setup.waves && this.wave <= this.setup.waves.length)) {
        this.waveTimer = TICKS_PER_SECOND * 2;
        // A breather between waves: survivors patch themselves up.
        for (const u of this.units) {
          if (u.alive && u.team === "blue") {
            const amount = Math.min(u.maxHp - u.hp, u.maxHp * 0.5);
            if (amount > 0) {
              u.hp += amount;
              this.events.push({ k: "heal", id: u.id, amount: Math.round(amount), x: u.x, y: u.y });
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
      blueTotal: this.totals.blue,
      redAlive,
      redTotal: this.totals.red,
      redKilled: this.redKilled,
      damageDealt: Math.round(this.damageDealt),
      healingDone: Math.round(this.healingDone),
      // Waves fully cleared.
      wave: winner === "blue" ? this.wave : this.wave - 1,
      said: this.blueSaid,
    };
  }

  private spawnWave() {
    this.waveTimer = -1;
    const n = ++this.wave;
    const specs = this.setup.endless ? endlessWave(n, this.rng) : this.setup.waves![n - 2];
    for (const s of specs) this.spawn(s, "red", true);
    if (this.setup.endless && n % 3 === 0) {
      // Reinforcements: a fallen blue fighter comes back.
      const fallen = this.units.find((u) => !u.alive && u.team === "blue" && !u.revived);
      if (fallen) {
        fallen.revived = true;
        const u = this.spawn({ type: fallen.type, x: 110, y: ARENA_H / 2, name: fallen.name }, "blue", true);
        u.index = fallen.index;
        this.totals.blue--;
      }
    }
    this.events.push({ k: "wave", n });
    if (this.setup.endless && n % 2 === 0) {
      const kinds: ItemKind[] = ["potion", "rage", "shield"];
      this.items.push({
        id: this.nextId++,
        kind: kinds[Math.floor(this.rng() * 3)],
        x: ARENA_W / 2 + (this.rng() - 0.5) * 300,
        y: ARENA_H / 2 + (this.rng() - 0.5) * 300,
      });
    }
  }

  // ---------------------------------------------------------------- scripts

  private runBrain(team: Team) {
    const brain = this.brains[team];
    if (!brain) return;
    const mine = this.units.filter((u) => u.alive && u.team === team);
    const theirs = this.units.filter((u) => u.alive && u.team !== team);
    const enemyViews = theirs.map(viewOf);
    const allyViews = mine.map(viewOf);
    const itemViews = this.items.map((i) => Object.freeze({ id: i.id, kind: i.kind, x: i.x, y: i.y }));
    const time = Math.round(this.tick * DT * 100) / 100;
    const arena = Object.freeze({ width: ARENA_W, height: ARENA_H, centerX: ARENA_W / 2, centerY: ARENA_H / 2 });
    const teamMem = this.teamMemory[team];
    const log = (...args: unknown[]) => this.log(team, args);
    const random = this.scriptRng;
    for (const u of mine) {
      const allies = allyViews.filter((v) => v.id !== u.id);
      const me = new Me(this, u, enemyViews, allies, itemViews);
      this.currentUnit = u;
      try {
        brain(me, enemyViews, allies, itemViews, time, arena, teamMem, log, distanceFn, random);
      } catch (e) {
        this.reportError(team, u, e);
      }
    }
    this.currentUnit = null;
  }

  private reportError(team: Team, u: Unit, e: unknown) {
    if (team !== "blue") {
      if (!this.warnedOnce.has("red")) console.error("Red script error", e);
      this.warnedOnce.add("red");
      return;
    }
    const line = errorLine(e);
    const text = friendlyRuntime(String((e as Error)?.message ?? e));
    const key = `${line}:${text}`;
    if (this.seenErrors.has(key)) return;
    this.seenErrors.add(key);
    this.logs.push({ tick: this.tick, kind: "error", text, line, unit: u.name });
  }

  private log(team: Team, args: unknown[]) {
    if (team !== "blue") return;
    if (this.logCount >= MAX_LOGS) return;
    this.logCount++;
    const u = this.currentUnit;
    if (this.logCount === MAX_LOGS) {
      this.logs.push({ tick: this.tick, kind: "warn", text: `That's a LOT of messages! I stopped showing them after ${MAX_LOGS}.` });
      return;
    }
    this.logs.push({ tick: this.tick, kind: "log", text: args.map((a) => formatValue(a)).join(" "), unit: u?.name });
  }

  noteSay(u: Unit) {
    if (u.team === "blue") this.blueSaid = true;
  }

  warn(key: string, text: string) {
    if (this.warnedOnce.has(key) || this.currentUnit?.team !== "blue") return;
    this.warnedOnce.add(key);
    this.logs.push({ tick: this.tick, kind: "warn", text, unit: this.currentUnit?.name });
  }

  resolveUnit(t: Thing): Unit | undefined {
    if (!t || typeof t !== "object" || typeof (t as { id?: unknown }).id !== "number") return undefined;
    const u = this.byId.get((t as { id: number }).id);
    return u && u.alive ? u : undefined;
  }

  // ---------------------------------------------------------------- actions

  private act(u: Unit) {
    if (u.specialReq && u.specialCd <= 0) this.useSpecial(u);
    const it = u.intent;
    u.moving = false;
    switch (it.k) {
      case "attack": {
        const t = this.byId.get(it.target);
        if (!t || !t.alive) return;
        const gap = dist(u, t) - u.radius - t.radius;
        if (gap <= u.stats.range) {
          u.facing = Math.atan2(t.y - u.y, t.x - u.x);
          if (u.cooldown <= 0) this.attack(u, t);
        } else this.moveToward(u, t.x, t.y, gap - u.stats.range + 1);
        return;
      }
      case "heal": {
        const t = this.byId.get(it.target);
        if (!t || !t.alive) return;
        const gap = t === u ? 0 : dist(u, t) - u.radius - t.radius;
        const range = u.stats.healRange ?? 0;
        if (gap <= range) {
          if (t !== u) u.facing = Math.atan2(t.y - u.y, t.x - u.x);
          if (u.cooldown <= 0 && t.hp < t.maxHp) {
            u.cooldown = u.stats.cooldown;
            this.applyHeal(u, t, u.stats.heal ?? 0);
          }
        } else this.moveToward(u, t.x, t.y, gap - range + 1);
        return;
      }
      case "move":
        this.moveToward(u, it.x, it.y, dist(u, it));
        return;
      case "flee":
        this.flee(u, it.x, it.y);
        return;
    }
  }

  private speedOf(u: Unit) {
    return u.stats.speed * (u.frenzyT > 0 ? 1.35 : 1);
  }

  private moveToward(u: Unit, x: number, y: number, maxStep: number) {
    const d = Math.hypot(x - u.x, y - u.y);
    if (d < 0.5 || maxStep <= 0) return;
    const step = Math.min(this.speedOf(u) * DT, maxStep, d);
    u.facing = Math.atan2(y - u.y, x - u.x);
    u.x = clampX(u.x + ((x - u.x) / d) * step, u.radius);
    u.y = clampY(u.y + ((y - u.y) / d) * step, u.radius);
    u.moving = true;
  }

  /** Runs away from a point, sliding along walls instead of getting stuck in them. */
  private flee(u: Unit, fx: number, fy: number) {
    const base = Math.atan2(u.y - fy, u.x - fx);
    // Backing away is a bit slower than charging, so chasers can catch up.
    const step = this.speedOf(u) * DT * 0.8;
    const look = 40;
    let best = base;
    let bestScore = -Infinity;
    for (const off of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6, 2.0, -2.0]) {
      const a = base + off;
      const lx = u.x + Math.cos(a) * look;
      const ly = u.y + Math.sin(a) * look;
      const inside = lx === clampX(lx, u.radius + 4) && ly === clampY(ly, u.radius + 4);
      const score = (inside ? 100 : 0) - Math.abs(off) * 10 + Math.hypot(lx - fx, ly - fy) * 0.1;
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }
    u.facing = best;
    u.x = clampX(u.x + Math.cos(best) * step, u.radius);
    u.y = clampY(u.y + Math.sin(best) * step, u.radius);
    u.moving = true;
  }

  private attack(u: Unit, t: Unit) {
    u.cooldown = u.stats.cooldown * (u.frenzyT > 0 ? 0.45 : 1);
    const dmg = u.stats.damage * (u.rageT > 0 ? 2 : 1);
    const proj = u.stats.projectile;
    if (!proj) {
      this.events.push({ k: "swing", id: u.id, angle: u.facing });
      this.damage(u, t, dmg, u.type === "ogre");
      return;
    }
    this.events.push({ k: "shoot", id: u.id, kind: proj });
    const speed = proj === "fireball" ? 300 : proj === "bolt" ? 360 : 480;
    this.projectiles.push({
      id: this.nextId++,
      kind: proj,
      team: u.team,
      owner: u.id,
      x: u.x + Math.cos(u.facing) * u.radius,
      y: u.y + Math.sin(u.facing) * u.radius,
      angle: u.facing,
      speed,
      target: t.id,
      damage: dmg,
      splash: u.stats.splash,
      life: 3,
    });
  }

  private useSpecial(u: Unit) {
    const req = u.specialReq!;
    const rage = u.rageT > 0;
    const mult = rage ? 2 : 1;
    const enemies = this.units.filter((e) => e.alive && e.team !== u.team);
    const target = req.target !== undefined ? this.byId.get(req.target) : undefined;
    const nearest = () => enemies.reduce<Unit | undefined>((b, e) => (!b || dist(u, e) < dist(u, b) ? e : b), undefined);
    switch (u.type) {
      case "knight": {
        const r = 58;
        this.events.push({ k: "whirl", id: u.id, x: u.x, y: u.y, r: u.radius + r });
        for (const e of enemies) if (dist(u, e) - e.radius - u.radius <= r) this.damage(u, e, 32 * mult, true);
        break;
      }
      case "archer": {
        const t = target?.alive ? target : nearest();
        if (!t) return;
        const a = Math.atan2(t.y - u.y, t.x - u.x);
        u.facing = a;
        this.events.push({ k: "shoot", id: u.id, kind: "powershot" });
        this.projectiles.push({
          id: this.nextId++,
          kind: "powershot",
          team: u.team,
          owner: u.id,
          x: u.x,
          y: u.y,
          angle: a,
          speed: 700,
          damage: 42 * mult,
          hits: new Set(),
          life: 2,
        });
        break;
      }
      case "healer": {
        const r = 160;
        this.events.push({ k: "explode", x: u.x, y: u.y, r, kind: "holy" });
        for (const a of this.units) if (a.alive && a.team === u.team && dist(a, u) <= r) this.applyHeal(u, a, 45);
        break;
      }
      case "mage": {
        let x: number, y: number;
        if (req.x !== undefined && req.y !== undefined) [x, y] = [req.x, req.y];
        else {
          const t = target?.alive ? target : nearest();
          if (!t) return;
          [x, y] = [t.x, t.y];
        }
        if (dist(u, { x, y }) > 320) {
          // Too far: the spell lands as far as it can reach.
          const a = Math.atan2(y - u.y, x - u.x);
          x = u.x + Math.cos(a) * 320;
          y = u.y + Math.sin(a) * 320;
        }
        const ticks = 18;
        this.blasts.push({ ticks, x, y, r: 85, damage: 65 * mult, team: u.team, rage });
        this.events.push({ k: "warn", x, y, r: 85, ticks });
        break;
      }
      case "goblin":
        u.frenzyT = 4;
        break;
      case "ogre": {
        const r = 95;
        this.events.push({ k: "explode", x: u.x, y: u.y, r: r + u.radius, kind: "stomp" });
        for (const e of enemies) {
          if (dist(u, e) - e.radius - u.radius > r) continue;
          this.damage(u, e, 40 * mult, true);
          const a = Math.atan2(e.y - u.y, e.x - u.x);
          e.x = clampX(e.x + Math.cos(a) * 45, e.radius);
          e.y = clampY(e.y + Math.sin(a) * 45, e.radius);
        }
        break;
      }
    }
    u.specialCd = u.stats.special.cooldown;
    this.events.push({ k: "special", id: u.id, name: u.stats.special.name, x: u.x, y: u.y });
  }

  private damage(src: Unit | null, t: Unit, amount: number, big = false) {
    if (!t.alive) return;
    let dmg = amount;
    let blocked = false;
    if (t.shield > 0) {
      const absorbed = Math.min(t.shield, dmg);
      t.shield -= absorbed;
      dmg -= absorbed;
      blocked = dmg <= 0;
    }
    t.hp -= dmg;
    if (src?.team === "blue") this.damageDealt += Math.min(dmg, t.hp + dmg);
    this.events.push({ k: "hit", id: t.id, amount: Math.round(amount), x: t.x, y: t.y, big, blocked });
    if (t.hp <= 0) {
      t.hp = 0;
      t.alive = false;
      if (t.team === "red") this.redKilled++;
      this.events.push({ k: "death", id: t.id, x: t.x, y: t.y, team: t.team });
    }
  }

  private applyHeal(src: Unit, t: Unit, amount: number) {
    const real = Math.min(amount, t.maxHp - t.hp);
    if (real <= 0) return;
    t.hp += real;
    if (src.team === "blue") this.healingDone += real;
    this.events.push({ k: "heal", id: t.id, amount: Math.round(real), x: t.x, y: t.y });
  }

  private separate() {
    const alive = this.units.filter((u) => u.alive);
    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < alive.length; i++) {
        for (let j = i + 1; j < alive.length; j++) {
          const a = alive[i];
          const b = alive[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const min = a.radius + b.radius;
          const d2 = dx * dx + dy * dy;
          if (d2 >= min * min) continue;
          const d = Math.sqrt(d2) || 0.01;
          const push = (min - d) / 2;
          const nx = d2 === 0 ? 1 : dx / d;
          const ny = d2 === 0 ? 0 : dy / d;
          const wa = b.radius ** 2 / (a.radius ** 2 + b.radius ** 2);
          const wb = 1 - wa;
          a.x = clampX(a.x - nx * push * 2 * wa, a.radius);
          a.y = clampY(a.y - ny * push * 2 * wa, a.radius);
          b.x = clampX(b.x + nx * push * 2 * wb, b.radius);
          b.y = clampY(b.y + ny * push * 2 * wb, b.radius);
        }
      }
    }
  }

  private moveProjectiles() {
    const keep: Projectile[] = [];
    for (const p of this.projectiles) {
      p.life -= DT;
      const step = p.speed * DT;
      if (p.kind === "powershot") {
        p.x += Math.cos(p.angle) * step;
        p.y += Math.sin(p.angle) * step;
        for (const u of this.units) {
          if (!u.alive || u.team === p.team || p.hits!.has(u.id)) continue;
          if (Math.hypot(u.x - p.x, u.y - p.y) <= u.radius + 10) {
            p.hits!.add(u.id);
            this.damage(this.byId.get(p.owner) ?? null, u, p.damage, true);
          }
        }
        if (p.life > 0 && p.x > 0 && p.x < ARENA_W && p.y > 0 && p.y < ARENA_H) keep.push(p);
        continue;
      }
      const t = p.target !== undefined ? this.byId.get(p.target) : undefined;
      if (!t || !t.alive) {
        // Target gone: the projectile keeps flying a little and fizzles out.
        p.x += Math.cos(p.angle) * step;
        p.y += Math.sin(p.angle) * step;
        if (p.life > 2.6 && p.x > WALL && p.x < ARENA_W - WALL) keep.push(p);
        continue;
      }
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      p.angle = Math.atan2(t.y - p.y, t.x - p.x);
      if (d <= step + t.radius * 0.5) {
        const owner = this.byId.get(p.owner) ?? null;
        if (p.splash) {
          this.events.push({ k: "explode", x: t.x, y: t.y, r: p.splash, kind: "fire" });
          for (const u of this.units) {
            if (!u.alive || u.team === p.team) continue;
            const dd = Math.hypot(u.x - t.x, u.y - t.y) - u.radius;
            if (u === t) this.damage(owner, u, p.damage);
            else if (dd <= p.splash) this.damage(owner, u, Math.round(p.damage * 0.6));
          }
        } else this.damage(owner, t, p.damage);
        continue;
      }
      p.x += Math.cos(p.angle) * step;
      p.y += Math.sin(p.angle) * step;
      if (p.life > 0) keep.push(p);
    }
    this.projectiles = keep;
  }

  private resolveBlasts() {
    const keep: PendingBlast[] = [];
    for (const b of this.blasts) {
      if (--b.ticks > 0) {
        keep.push(b);
        continue;
      }
      this.events.push({ k: "explode", x: b.x, y: b.y, r: b.r, kind: "meteor" });
      for (const u of this.units) {
        if (!u.alive || u.team === b.team) continue;
        const d = Math.hypot(u.x - b.x, u.y - b.y) - u.radius;
        if (d <= b.r) this.damage(this.units.find((x) => x.team === b.team) ?? null, u, Math.round(b.damage * (1 - Math.max(0, d) / b.r / 2)), true);
      }
    }
    this.blasts = keep;
  }

  private pickupItems() {
    if (!this.items.length) return;
    this.items = this.items.filter((it) => {
      const u = this.units.find((u) => u.alive && Math.hypot(u.x - it.x, u.y - it.y) <= u.radius + ITEM_RADIUS);
      if (!u) return true;
      if (it.kind === "potion") this.applyHeal(u, u, 60);
      else if (it.kind === "rage") u.rageT = 8;
      else u.shield = 60;
      this.events.push({ k: "pickup", id: u.id, item: it.kind, x: it.x, y: it.y });
      return false;
    });
  }
}

function infoOf(u: Unit): UnitInfo {
  return { id: u.id, type: u.type, team: u.team, name: u.name, maxHp: u.maxHp, radius: u.radius };
}

function viewOf(u: Unit): UnitView {
  return Object.freeze({
    id: u.id,
    type: u.type,
    team: u.team,
    name: u.name,
    x: Math.round(u.x * 10) / 10,
    y: Math.round(u.y * 10) / 10,
    health: Math.ceil(u.hp),
    maxHealth: u.maxHp,
    specialReady: u.specialCd <= 0,
    isRaging: u.rageT > 0 || u.frenzyT > 0,
    hasShield: u.shield > 0,
  });
}

function distanceFn(a: Thing, b: Thing): number {
  if (!a || !b) return Infinity;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The `me` object a script receives: information about the fighter plus commands. */
class Me {
  readonly id: number;
  readonly type: UnitType;
  readonly team: Team;
  readonly name: string;
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly speed: number;
  readonly range: number;
  readonly specialReady: boolean;
  readonly specialCooldown: number;
  readonly isRaging: boolean;
  readonly hasShield: boolean;
  readonly memory: Record<string, unknown>;
  #b: Battle;
  #u: Unit;
  #enemies: readonly UnitView[];
  #allies: readonly UnitView[];
  #items: readonly { id: number; kind: ItemKind; x: number; y: number }[];

  constructor(b: Battle, u: Unit, enemies: readonly UnitView[], allies: readonly UnitView[], items: Me["items"]) {
    this.#b = b;
    this.#u = u;
    this.#enemies = enemies;
    this.#allies = allies;
    this.#items = items;
    this.id = u.id;
    this.type = u.type;
    this.team = u.team;
    this.name = u.name;
    this.index = u.index;
    this.x = Math.round(u.x * 10) / 10;
    this.y = Math.round(u.y * 10) / 10;
    this.health = Math.ceil(u.hp);
    this.maxHealth = u.maxHp;
    this.speed = u.stats.speed;
    this.range = u.stats.range;
    this.specialReady = u.specialCd <= 0;
    this.specialCooldown = Math.round(u.specialCd * 10) / 10;
    this.isRaging = u.rageT > 0 || u.frenzyT > 0;
    this.hasShield = u.shield > 0;
    this.memory = u.memory;
  }

  private get items() {
    return this.#items;
  }

  // ---- commands

  attack(target: Thing) {
    const t = this.#b.resolveUnit(target);
    if (!t) {
      if (target && typeof target === "object" && !("id" in target)) this.#b.warn("attack-point", "me.attack() needs a fighter (like me.nearestEnemy()), not a place. To walk somewhere use me.moveTo(x, y).");
      return;
    }
    if (t.team === this.team) {
      this.#b.warn("friendly-fire", "Whoa! You told a fighter to attack someone on YOUR team. I ignored that. 😅");
      return;
    }
    this.#u.intent = { k: "attack", target: t.id };
  }

  moveTo(x: number | Thing, y?: number) {
    if (typeof x === "number" && typeof y === "number") this.#u.intent = { k: "move", x, y };
    else if (x && typeof x === "object" && typeof x.x === "number") this.#u.intent = { k: "move", x: x.x, y: x.y };
  }

  moveAwayFrom(x: number | Thing, y?: number) {
    if (typeof x === "number" && typeof y === "number") this.#u.intent = { k: "flee", x, y };
    else if (x && typeof x === "object" && typeof x.x === "number") this.#u.intent = { k: "flee", x: x.x, y: x.y };
  }

  heal(target: Thing) {
    if (this.#u.type !== "healer") {
      this.#b.warn("heal-type", `Only healers can heal! (${this.name} is a ${this.type}.) Check with if (me.type == "healer").`);
      return;
    }
    const t = target === this ? this.#u : this.#b.resolveUnit(target);
    if (!t) return;
    if (t.team !== this.team) {
      this.#b.warn("heal-enemy", "Hey, don't heal the enemies! 😱");
      return;
    }
    this.#u.intent = { k: "heal", target: t.id };
  }

  special(target?: Thing | number, y?: number) {
    if (typeof target === "number" && typeof y === "number") this.#u.specialReq = { x: target, y };
    else if (target && typeof target === "object") {
      const t = this.#b.resolveUnit(target);
      this.#u.specialReq = t ? { target: t.id } : { x: target.x, y: target.y };
    } else this.#u.specialReq = {};
  }

  say(text: unknown) {
    const s = formatValue(text).slice(0, 40);
    if (this.#u.say !== s) this.#u.say = s;
    this.#b.noteSay(this.#u);
    this.#u.sayT = 1.5;
  }

  stop() {
    this.#u.intent = { k: "idle" };
  }

  // ---- questions

  distanceTo(x: Thing | number, y?: number): number {
    if (typeof x === "number" && typeof y === "number") return Math.hypot(this.x - x, this.y - y);
    if (!x || typeof x !== "object") return Infinity;
    return Math.hypot(this.x - x.x, this.y - x.y);
  }

  inRange(target: Thing): boolean {
    const t = this.#b.resolveUnit(target);
    if (!t) return false;
    return Math.hypot(this.#u.x - t.x, this.#u.y - t.y) - this.#u.radius - t.radius <= this.#u.stats.range;
  }

  nearestEnemy() {
    return this.#nearest(this.#enemies);
  }
  weakestEnemy() {
    return this.#best(this.#enemies, (u) => -u.health);
  }
  strongestEnemy() {
    return this.#best(this.#enemies, (u) => u.health);
  }
  nearestAlly() {
    return this.#nearest(this.#allies);
  }
  weakestAlly() {
    return this.#best(this.#allies, (u) => -u.health / u.maxHealth);
  }
  nearestItem(kind?: ItemKind) {
    return this.#nearest(kind ? this.#items.filter((i) => i.kind === kind) : this.#items);
  }
  enemiesNear(radius = 100) {
    return this.#enemies.filter((e) => this.distanceTo(e) <= radius);
  }
  alliesNear(radius = 100) {
    return this.#allies.filter((e) => this.distanceTo(e) <= radius);
  }

  #nearest<T extends { x: number; y: number }>(list: readonly T[]): T | null {
    return this.#best(list, (t) => -this.distanceTo(t));
  }

  #best<T extends { x: number; y: number }>(list: readonly T[], score: (t: T) => number): T | null {
    let best: T | null = null;
    let bestScore = -Infinity;
    for (const t of list) {
      // Ties are broken by distance so units don't run across the map for nothing.
      const s = score(t) - this.distanceTo(t) * 1e-6;
      if (s > bestScore) {
        bestScore = s;
        best = t;
      }
    }
    return best;
  }
}

// ---------------------------------------------------------------- endless mode

export function endlessWave(n: number, rng: () => number): SpawnSpec[] {
  const specs: SpawnSpec[] = [];
  const add = (type: UnitType, count: number) => {
    for (let i = 0; i < count; i++) {
      specs.push({ type, x: ARENA_W - 90 - rng() * 120, y: 90 + rng() * (ARENA_H - 180) });
    }
  };
  add("goblin", 1 + Math.ceil(n * 0.5));
  add("knight", Math.floor((n - 1) / 3));
  add("archer", Math.floor((n - 1) / 4));
  add("healer", Math.floor(n / 7));
  add("mage", Math.floor(n / 9));
  if (n % 7 === 0) add("ogre", n / 7);
  return specs;
}

// ---------------------------------------------------------------- headless run

/** Runs a whole battle in one go (used by the worker and the balance script). */
export function runBattle(
  setup: BattleSetup,
  hooks: { onInit?: (infos: UnitInfo[]) => void; onFrames?: (frames: Frame[], logs: LogEntry[]) => void } = {},
): { result?: BattleResult; compileError?: { message: string; line?: number; col?: number } } {
  const battle = new Battle(setup);
  const err = battle.prepare();
  if (err) return { compileError: err };
  hooks.onInit?.(battle.unitInfos());
  let chunk: Frame[] = [];
  while (!battle.result) {
    chunk.push(battle.step());
    if (chunk.length >= 40 || battle.result) {
      hooks.onFrames?.(chunk, battle.logs.splice(0));
      chunk = [];
    }
  }
  return { result: battle.result! };
}
