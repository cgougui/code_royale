/**
 * The API a player's script sees: the `me` object and read-only views of other fighters.
 *
 * Scripts never touch engine objects. They get frozen snapshots (views) and give
 * orders through `me`, which only records an intent for this tick; the orders
 * system carries it out afterwards.
 */
import type { Point } from "../math/geometry";
import { message, type ItemKind, type Message, type Team, type UnitType } from "../protocol";
import type { Unit, World } from "../world/state";
import { canSee } from "../world/vision";
import { formatValue } from "./format";

/** What the API needs from its surroundings. */
export interface ScriptHost {
  readonly world: World;
  /** A one-time friendly warning in the player's console. */
  warn(warning: Message): void;
  /** A fighter used me.say(). */
  noteSay(u: Unit): void;
}

/** What a script sees when it looks at another fighter. */
export interface UnitView {
  readonly id: number;
  readonly type: UnitType;
  readonly team: Team;
  readonly name: string;
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly specialReady: boolean;
  readonly isRaging: boolean;
  readonly hasShield: boolean;
  readonly isHidden: boolean;
  readonly isSpotted: boolean;
}

export interface ItemView {
  readonly id: number;
  readonly kind: ItemKind;
  readonly x: number;
  readonly y: number;
}

type Thing = { x: number; y: number; id?: number } | null | undefined;

export function viewOf(w: World, u: Unit): UnitView {
  return Object.freeze({
    id: u.id,
    type: u.type,
    team: u.team,
    name: u.name,
    index: u.index,
    x: Math.round(u.x * 10) / 10,
    y: Math.round(u.y * 10) / 10,
    health: Math.ceil(u.hp),
    maxHealth: u.maxHp,
    specialReady: u.specialCd <= 0,
    isRaging: u.rageT > 0 || u.frenzyT > 0,
    hasShield: u.shield > 0,
    isHidden: w.isHidden(u),
    isSpotted: u.seen,
  });
}

/** `distance(a, b)` for scripts. */
export function distanceFn(a: Thing, b: Thing): number {
  if (!a || !b) return Infinity;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function toPoint(v: unknown): Point | null {
  if (Array.isArray(v) && typeof v[0] === "number" && typeof v[1] === "number") return { x: v[0], y: v[1] };
  if (v && typeof v === "object" && typeof (v as Point).x === "number" && typeof (v as Point).y === "number") return { x: (v as Point).x, y: (v as Point).y };
  return null;
}

/** The `me` object a script receives: information about the fighter plus commands. */
export class Me {
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
  readonly sight: number;
  readonly specialReady: boolean;
  readonly specialCooldown: number;
  readonly isRaging: boolean;
  readonly hasShield: boolean;
  readonly isSpotted: boolean;
  readonly isHidden: boolean;
  readonly inBush: boolean;
  readonly memory: Record<string, unknown>;
  #h: ScriptHost;
  #u: Unit;
  #enemies: readonly UnitView[];
  #allies: readonly UnitView[];
  #items: readonly ItemView[];

  constructor(h: ScriptHost, u: Unit, enemies: readonly UnitView[], allies: readonly UnitView[], items: readonly ItemView[]) {
    this.#h = h;
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
    this.sight = u.stats.sight;
    this.specialReady = u.specialCd <= 0;
    this.specialCooldown = Math.round(u.specialCd * 10) / 10;
    this.isRaging = u.rageT > 0 || u.frenzyT > 0;
    this.hasShield = u.shield > 0;
    this.isSpotted = u.seen;
    this.isHidden = h.world.isHidden(u);
    this.inBush = u.inBush;
    this.memory = u.memory;
  }

  get #w() {
    return this.#h.world;
  }

  // ---- fighting

  attack(target: Thing) {
    const t = this.#w.resolveUnit(target);
    if (!t) {
      if (target && typeof target === "object" && !("id" in target)) this.#h.warn(message("warn.attackPoint"));
      return;
    }
    if (t.team === this.team) {
      this.#h.warn(message("warn.friendlyFire"));
      return;
    }
    this.#u.intent = { k: "attack", target: t.id };
  }

  special(target?: Thing | number, y?: number) {
    if (typeof target === "number" && typeof y === "number") this.#u.specialReq = { x: target, y };
    else if (target && typeof target === "object") {
      const t = this.#w.resolveUnit(target);
      this.#u.specialReq = t ? { target: t.id } : { x: target.x, y: target.y };
    } else this.#u.specialReq = {};
  }

  // ---- moving around

  moveTo(x: number | Thing, y?: number) {
    const p = typeof x === "number" && typeof y === "number" ? { x, y } : toPoint(x);
    if (p) this.#u.intent = { k: "move", ...p };
  }

  moveAwayFrom(x: number | Thing, y?: number) {
    const p = typeof x === "number" && typeof y === "number" ? { x, y } : toPoint(x);
    if (p) this.#u.intent = { k: "flee", ...p };
  }

  explore() {
    this.#u.intent = { k: "explore" };
  }

  patrol(points: unknown) {
    const pts = Array.isArray(points) ? points.map(toPoint).filter((p): p is Point => !!p) : [];
    if (pts.length === 0) {
      this.#h.warn(message("warn.patrolNeedsPlaces"));
      return;
    }
    this.#u.intent = { k: "patrol", points: pts };
  }

  follow(friend: Thing, distance = 60) {
    const t = this.#w.resolveUnit(friend);
    if (!t || t.id === this.id) return;
    this.#u.intent = { k: "follow", target: t.id, dist: Math.max(20, Number(distance) || 60) };
  }

  circle(thing: Thing | number, y?: number | unknown, distance?: unknown) {
    let center: Point | null;
    let d: unknown;
    let target: number | undefined;
    if (typeof thing === "number" && typeof y === "number") {
      center = { x: thing, y };
      d = distance;
    } else {
      center = toPoint(thing);
      d = y;
      const t = this.#w.resolveUnit(thing);
      if (t) target = t.id;
    }
    if (!center) return;
    this.#u.intent = { k: "circle", target, x: center.x, y: center.y, dist: Math.max(20, Number(d) || 100) };
  }

  hide() {
    if (!this.#w.bushes.length) {
      this.#h.warn(message("warn.noBush"));
      return;
    }
    this.#u.intent = { k: "hide" };
  }

  escape() {
    this.#u.intent = { k: "escape" };
  }

  wait() {
    this.#u.intent = { k: "wait" };
  }

  stop() {
    this.#u.intent = { k: "wait" };
  }

  say(text: unknown) {
    const s = formatValue(text).slice(0, 40);
    if (this.#u.say !== s) this.#u.say = s;
    this.#h.noteSay(this.#u);
    this.#u.sayT = 1.5;
  }

  // ---- questions

  distanceTo(x: Thing | number, y?: number): number {
    if (typeof x === "number" && typeof y === "number") return Math.hypot(this.x - x, this.y - y);
    if (!x || typeof x !== "object") return Infinity;
    return Math.hypot(this.x - x.x, this.y - x.y);
  }

  inRange(target: Thing): boolean {
    const t = this.#w.resolveUnit(target);
    if (!t) return false;
    return Math.hypot(this.#u.x - t.x, this.#u.y - t.y) - this.#u.radius - t.radius <= this.#u.stats.range;
  }

  canSee(target: Thing): boolean {
    const t = this.#w.resolveUnit(target);
    return !!t && canSee(this.#w, this.#u, t);
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
  nearestBush() {
    const b = this.#w.nearestBush(this.#u);
    return b ? Object.freeze({ x: b.x, y: b.y, radius: b.r }) : null;
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
