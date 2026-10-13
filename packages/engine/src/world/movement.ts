/**
 * Movement system: walking (with rock avoidance), fleeing, orbiting, exploring,
 * looking around, and the collision pass that keeps fighters apart.
 */
import { clampX, clampY, dist, type Point } from "../math/geometry";
import { DT, TICKS_PER_SECOND } from "../rules";
import { CELL, COLS, ROWS, type Unit, type World } from "./state";

export function moveToward(w: World, u: Unit, x: number, y: number, maxStep: number) {
  const d = Math.hypot(x - u.x, y - u.y);
  if (d < 0.5 || maxStep <= 0) return;
  const step = Math.min(w.speedOf(u) * DT, maxStep, d);
  const a = avoidRocks(w, u, Math.atan2(y - u.y, x - u.x), d);
  u.facing = a;
  u.x = clampX(u.x + Math.cos(a) * step, u.radius);
  u.y = clampY(u.y + Math.sin(a) * step, u.radius);
  u.moving = true;
}

/** If a rock is in the way, walk around it instead of bumping into it. */
function avoidRocks(w: World, u: Unit, a: number, targetDist: number) {
  let closest = Infinity;
  let out = a;
  for (const r of w.rocks) {
    const rx = r.x - u.x;
    const ry = r.y - u.y;
    const along = rx * Math.cos(a) + ry * Math.sin(a);
    if (along <= 0 || along > 70 + r.r || targetDist < along - r.r) continue;
    const lateral = Math.cos(a) * ry - Math.sin(a) * rx;
    const clearance = r.r + u.radius + 5;
    if (Math.abs(lateral) >= clearance || along >= closest) continue;
    closest = along;
    const dr = Math.hypot(rx, ry);
    const offset = Math.asin(Math.min(1, clearance / dr));
    const ac = Math.atan2(ry, rx);
    out = lateral >= 0 ? ac - offset : ac + offset;
  }
  return out;
}

/** Runs in a direction, sliding along walls and rocks instead of getting stuck. */
export function flee(w: World, u: Unit, base: number) {
  // Backing away is a bit slower than charging, so chasers can catch up.
  const step = w.speedOf(u) * DT * 0.8;
  const look = 40;
  let best = base;
  let bestScore = -Infinity;
  for (const off of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6, 2.0, -2.0]) {
    const a = base + off;
    const lx = u.x + Math.cos(a) * look;
    const ly = u.y + Math.sin(a) * look;
    const inside = lx === clampX(lx, u.radius + 4) && ly === clampY(ly, u.radius + 4);
    const free = !w.rocks.some((r) => Math.hypot(lx - r.x, ly - r.y) < r.r + u.radius);
    const score = (inside ? 100 : 0) + (free ? 50 : 0) - Math.abs(off) * 10;
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

/** Runs from every enemy the team can see, the closest ones counting the most. */
export function escape(w: World, u: Unit) {
  let vx = 0;
  let vy = 0;
  for (const e of w.units) {
    if (!e.alive || e.team === u.team || !w.spotted[u.team].has(e.id)) continue;
    const d = Math.max(10, dist(u, e));
    if (d > 320) continue;
    vx += (u.x - e.x) / (d * d);
    vy += (u.y - e.y) / (d * d);
  }
  if (vx || vy) flee(w, u, Math.atan2(vy, vx));
  else lookAround(w, u);
}

/** Moves around a point at the given distance. Turns back when it hits a wall or a rock. */
export function orbit(w: World, u: Unit, c: Point, radius: number, speedFactor: number, faceCenter: boolean) {
  if (w.tick >= u.strafeFlipAt) {
    u.strafeDir = w.rng() < 0.5 ? -1 : 1;
    u.strafeFlipAt = w.tick + 30 + Math.floor(w.rng() * 40);
  }
  const step = w.speedOf(u) * DT * speedFactor;
  const cur = Math.max(1, dist(u, c));
  const a = Math.atan2(u.y - c.y, u.x - c.x);
  const na = a + (u.strafeDir * step) / Math.max(cur, 20);
  const nr = cur + Math.max(-step, Math.min(step, radius - cur));
  const nx = c.x + Math.cos(na) * nr;
  const ny = c.y + Math.sin(na) * nr;
  const hit = nx !== clampX(nx, u.radius + 2) || ny !== clampY(ny, u.radius + 2) || w.rocks.some((r) => Math.hypot(nx - r.x, ny - r.y) < r.r + u.radius);
  if (hit) {
    u.strafeDir = -u.strafeDir;
    return;
  }
  if (!faceCenter) u.facing = Math.atan2(ny - u.y, nx - u.x);
  u.x = nx;
  u.y = ny;
  u.moving = true;
}

/** Standing still: keep an eye on the closest enemy in sight, or look left and right. */
export function lookAround(w: World, u: Unit) {
  let near: Unit | undefined;
  for (const e of w.units) {
    if (!e.alive || e.team === u.team || !w.spotted[u.team].has(e.id)) continue;
    if (!near || dist(u, e) < dist(u, near)) near = e;
  }
  if (near) u.facing = Math.atan2(near.y - u.y, near.x - u.x);
  else u.facing = (u.team === "blue" ? 0 : Math.PI) + Math.sin(w.tick * 0.05 + u.id) * 0.9;
}

/** Walks towards the parts of the map this team hasn't looked at for the longest time. */
export function explore(w: World, u: Unit) {
  const grid = w.explored[u.team];
  const cellOf = (p: Point) => Math.min(ROWS - 1, Math.floor(p.y / CELL)) * COLS + Math.min(COLS - 1, Math.floor(p.x / CELL));
  let t = u.exploreTarget;
  const stale = !t || w.tick > t.until || dist(u, t) < 30 || w.tick - grid[cellOf(t)] < 10;
  if (stale) {
    // Explorers spread out a little: avoid places a teammate is already heading to.
    const taken = w.units.filter((o) => o !== u && o.alive && o.team === u.team && o.intent.k === "explore" && o.exploreTarget).map((o) => o.exploreTarget!);
    let best: Point | null = null;
    let bestScore = -Infinity;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = { x: clampX((c + 0.5) * CELL, 30), y: clampY((r + 0.5) * CELL, 30) };
        if (w.rocks.some((k) => dist(p, k) < k.r + 20)) continue;
        const age = Math.min(40, (w.tick - grid[r * COLS + c]) / TICKS_PER_SECOND);
        const crowded = taken.some((q) => dist(q, p) < 170) ? 3 : 0;
        const score = age - dist(u, p) / 45 - crowded + w.rng() * 2;
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }
    }
    t = u.exploreTarget = best ? { ...best, until: w.tick + TICKS_PER_SECOND * 6 } : null;
  }
  if (t) moveToward(w, u, t.x, t.y, dist(u, t));
}

/** Pushes overlapping fighters apart (heavier ones move less) and out of rocks. */
export function separate(w: World) {
  const alive = w.units.filter((u) => u.alive);
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
    for (const u of alive) {
      for (const r of w.rocks) {
        const d = dist(u, r) || 0.01;
        const min = r.r + u.radius;
        if (d < min) {
          u.x = clampX(r.x + ((u.x - r.x) / d) * min, u.radius);
          u.y = clampY(r.y + ((u.y - r.y) / d) * min, u.radius);
        }
      }
    }
  }
}
