/**
 * Vision system: who can see whom (detection radius, bushes, rocks, noise),
 * shared team vision, "spotted"/"lost" events and the explored-cells memory.
 */
import { dist, segDist, type Point } from "../math/geometry";
import type { Team } from "../protocol";
import { BUSH_DETECT, SCOUT_BUSH_DETECT } from "../rules";
import { CELL, COLS, otherTeam, ROWS, type Unit, type World } from "./state";

/** Is the line between two points blocked by a rock? */
export function blocked(w: World, a: Point, b: Point) {
  for (const r of w.rocks) if (segDist(r, a, b) < r.r - 3) return true;
  return false;
}

/** Can fighter `v` see fighter `e` right now? */
export function canSee(w: World, v: Unit, e: Unit): boolean {
  if (e.vanishT > 0 && e.team !== v.team) return false;
  let range = w.isHidden(e) && e.team !== v.team ? (v.type === "scout" ? SCOUT_BUSH_DETECT : BUSH_DETECT) : v.stats.sight;
  // Attacking makes noise: for a moment you can be spotted from further away.
  if (e.revealT > 0) range = v.stats.sight * 1.5;
  if (dist(v, e) - e.radius > range) return false;
  return !blocked(w, v, e);
}

/** Recomputes what each team sees. With `emit`, pushes "spotted" / "lost" events. */
export function computeVision(w: World, emit: boolean) {
  const alive = w.units.filter((u) => u.alive);
  for (const u of alive) u.inBush = !!w.bushAt(u);
  for (const team of ["blue", "red"] as Team[]) {
    const viewers = alive.filter((u) => u.team === team);
    const seen = new Set<number>();
    for (const e of alive) {
      if (e.team === team) continue;
      if (viewers.some((v) => canSee(w, v, e))) seen.add(e.id);
    }
    const last = w.lastSeen[team];
    for (const id of seen) {
      const prev = last.get(id);
      // "!" only when an enemy pops up after being out of sight for a while (no flicker spam).
      if (emit && (prev === undefined || w.tick - prev > 40)) {
        const e = w.byId.get(id)!;
        w.events.push({ k: "spotted", id, by: team, x: e.x, y: e.y });
      }
      last.set(id, w.tick);
    }
    for (const id of w.spotted[team]) {
      const e = w.byId.get(id)!;
      if (!seen.has(id) && emit && e.alive) w.events.push({ k: "lost", id, by: team, x: e.x, y: e.y });
    }
    w.spotted[team] = seen;
    markExplored(w, team, viewers);
  }
  for (const u of alive) u.seen = w.spotted[otherTeam(u.team)].has(u.id);
}

/** Remember which parts of the map this team has looked at. */
function markExplored(w: World, team: Team, viewers: Unit[]) {
  const grid = w.explored[team];
  for (const v of viewers) {
    const s = v.stats.sight;
    const c0 = Math.max(0, Math.floor((v.x - s) / CELL));
    const c1 = Math.min(COLS - 1, Math.floor((v.x + s) / CELL));
    const r0 = Math.max(0, Math.floor((v.y - s) / CELL));
    const r1 = Math.min(ROWS - 1, Math.floor((v.y + s) / CELL));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (Math.hypot((c + 0.5) * CELL - v.x, (r + 0.5) * CELL - v.y) <= s) grid[r * COLS + c] = w.tick;
      }
    }
  }
}
