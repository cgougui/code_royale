/**
 * The mutable state of a battle. Systems (vision, movement, combat, items, orders)
 * are plain functions that read and write a World; they hold no state of their own.
 */
import { dist, type Point } from "../math/geometry";
import { makeRng } from "../math/rng";
import type { Circle, GameEvent, ItemKind, ItemSpawnSpec, ProjectileKind, SpawnSpec, Team, UnitInfo, UnitSnap, UnitStats, UnitType } from "../protocol";
import { ARENA_H, ARENA_W } from "../rules";
import { BLUE_NAMES, RED_NAMES, UNIT_STATS } from "../units";

/** What a fighter is doing, as shown to the player. */
export type Act = UnitSnap["act"];

/** An order given by a script for the current tick. */
export type Intent =
  | { k: "idle" }
  | { k: "wait" }
  | { k: "circle"; target?: number; x: number; y: number; dist: number }
  | { k: "attack"; target: number }
  | { k: "move"; x: number; y: number }
  | { k: "flee"; x: number; y: number }
  | { k: "explore" }
  | { k: "patrol"; points: Point[] }
  | { k: "follow"; target: number; dist: number }
  | { k: "hide" }
  | { k: "escape" };

export interface Unit {
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
  vanishT: number;
  revealT: number;
  shield: number;
  moving: boolean;
  alive: boolean;
  inBush: boolean;
  /** Spotted by the other team this tick. */
  seen: boolean;
  say?: string;
  sayT: number;
  memory: Record<string, unknown>;
  intent: Intent;
  revived?: boolean;
  specialReq: { target?: number; x?: number; y?: number } | null;
  exploreTarget: (Point & { until: number }) | null;
  patrolIdx: number;
  strafeDir: number;
  strafeFlipAt: number;
  act: Act;
  targetId?: number;
}

export interface Projectile {
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

export interface Item {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
}

export interface PendingBlast {
  ticks: number;
  x: number;
  y: number;
  r: number;
  damage: number;
  team: Team;
}

/** Size of the cells of the "explored" grid used by me.explore(). */
export const CELL = 80;
export const COLS = Math.ceil(ARENA_W / CELL);
export const ROWS = Math.ceil(ARENA_H / CELL);

export function otherTeam(t: Team): Team {
  return t === "blue" ? "red" : "blue";
}

export class World {
  tick = 0;
  units: Unit[] = [];
  byId = new Map<number, Unit>();
  projectiles: Projectile[] = [];
  items: Item[] = [];
  /** Items not on the ground yet, sorted by appearance time. */
  itemQueue: ItemSpawnSpec[];
  blasts: PendingBlast[] = [];
  /** Events of the current tick (reset every step). */
  events: GameEvent[] = [];
  readonly bushes: Circle[];
  readonly rocks: Circle[];
  /** Enemies each team can see right now. */
  spotted: Record<Team, Set<number>> = { blue: new Set(), red: new Set() };
  /** Last tick each enemy was seen, per team (to avoid "!" spam). */
  lastSeen: Record<Team, Map<number, number>> = { blue: new Map(), red: new Map() };
  /** For each map cell, the last tick the team had eyes on it (used by explore). */
  explored: Record<Team, Float64Array>;
  totals = { blue: 0, red: 0 };
  damageDealt = 0;
  redKilled = 0;
  /** The simulation's own random generator (never shared with scripts). */
  readonly rng: () => number;
  private nextId = 1;

  constructor(opts: { seed: number; bushes?: Circle[]; rocks?: Circle[]; items?: ItemSpawnSpec[] }) {
    this.rng = makeRng(opts.seed);
    this.itemQueue = [...(opts.items ?? [])].sort((a, b) => a.at - b.at);
    this.bushes = opts.bushes ?? [];
    this.rocks = opts.rocks ?? [];
    this.explored = { blue: new Float64Array(COLS * ROWS).fill(-1e9), red: new Float64Array(COLS * ROWS).fill(-1e9) };
  }

  newId() {
    return this.nextId++;
  }

  spawn(s: SpawnSpec, team: Team, emit = false): Unit {
    const stats = UNIT_STATS[s.type];
    const names = team === "blue" ? BLUE_NAMES : RED_NAMES;
    const count = this.units.filter((u) => u.team === team).length;
    const u: Unit = {
      id: this.newId(),
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
      vanishT: 0,
      revealT: 0,
      shield: 0,
      moving: false,
      alive: true,
      inBush: false,
      seen: false,
      sayT: 0,
      memory: {},
      intent: { k: "idle" },
      specialReq: null,
      exploreTarget: null,
      patrolIdx: 0,
      strafeDir: this.rng() < 0.5 ? -1 : 1,
      strafeFlipAt: 0,
      act: "idle",
    };
    this.units.push(u);
    this.byId.set(u.id, u);
    this.totals[team]++;
    if (emit) this.events.push({ k: "spawn", unit: infoOf(u), x: u.x, y: u.y });
    return u;
  }

  /** Finds the live fighter a script refers to (scripts only hold read-only views with an id). */
  resolveUnit(t: unknown): Unit | undefined {
    if (!t || typeof t !== "object" || typeof (t as { id?: unknown }).id !== "number") return undefined;
    const u = this.byId.get((t as { id: number }).id);
    return u && u.alive ? u : undefined;
  }

  bushAt(p: Point): Circle | undefined {
    return this.bushes.find((b) => dist(p, b) <= b.r);
  }

  nearestBush(p: Point): Circle | undefined {
    let best: Circle | undefined;
    for (const b of this.bushes) if (!best || dist(p, b) < dist(p, best)) best = b;
    return best;
  }

  /** In a bush, and not given away by a recent attack. */
  isHidden(u: Unit) {
    return u.inBush && u.revealT <= 0;
  }

  speedOf(u: Unit) {
    return u.stats.speed * (u.frenzyT > 0 ? 1.35 : 1) * (u.vanishT > 0 ? 1.4 : 1);
  }

  alive(team?: Team) {
    return this.units.filter((u) => u.alive && (!team || u.team === team));
  }
}

export function infoOf(u: Unit): UnitInfo {
  return { id: u.id, type: u.type, team: u.team, name: u.name, maxHp: u.maxHp, radius: u.radius };
}
