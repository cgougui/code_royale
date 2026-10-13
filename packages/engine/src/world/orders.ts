/**
 * Orders system: turns each fighter's intent for this tick (set by its script)
 * into actual movement and attacks, using the other systems.
 */
import { dist } from "../math/geometry";
import { attack, footwork, useSpecial } from "./combat";
import { escape, explore, flee, lookAround, moveToward, orbit } from "./movement";
import type { Act, Intent, Unit, World } from "./state";

const ACT_OF: Record<Intent["k"], Act> = {
  idle: "idle",
  wait: "wait",
  attack: "attack",
  move: "move",
  flee: "escape",
  explore: "explore",
  patrol: "patrol",
  follow: "follow",
  circle: "circle",
  hide: "hide",
  escape: "escape",
};

export function carryOutOrders(w: World, u: Unit) {
  if (u.specialReq && u.specialCd <= 0) useSpecial(w, u);
  const it = u.intent;
  u.moving = false;
  u.act = ACT_OF[it.k];
  u.targetId = undefined;
  switch (it.k) {
    case "idle":
    case "wait":
      lookAround(w, u);
      return;
    case "attack": {
      const t = w.byId.get(it.target);
      if (!t || !t.alive || !w.spotted[u.team].has(t.id)) return;
      u.targetId = t.id;
      const gap = dist(u, t) - u.radius - t.radius;
      const melee = !u.stats.projectile;
      // Melee rhythm: step in, strike, step back and circle, step in again.
      const recovering = melee && u.type !== "ogre" && u.cooldown > 0.3;
      if (recovering && gap <= u.stats.range + 30) {
        u.facing = Math.atan2(t.y - u.y, t.x - u.x);
        footwork(w, u, t);
        return;
      }
      if (gap > u.stats.range) {
        moveToward(w, u, t.x, t.y, gap - u.stats.range + 1);
        return;
      }
      u.facing = Math.atan2(t.y - u.y, t.x - u.x);
      if (u.cooldown <= 0) attack(w, u, t);
      else footwork(w, u, t);
      return;
    }
    case "move":
      moveToward(w, u, it.x, it.y, dist(u, it));
      return;
    case "flee":
      flee(w, u, Math.atan2(u.y - it.y, u.x - it.x));
      return;
    case "explore":
      explore(w, u);
      return;
    case "patrol": {
      const pts = it.points;
      let p = pts[u.patrolIdx % pts.length];
      if (dist(u, p) < u.radius + 6) {
        u.patrolIdx = (u.patrolIdx + 1) % pts.length;
        p = pts[u.patrolIdx];
      }
      moveToward(w, u, p.x, p.y, dist(u, p));
      return;
    }
    case "follow": {
      const t = w.byId.get(it.target);
      if (!t || !t.alive) return;
      u.targetId = t.id;
      const d = dist(u, t);
      if (d > it.dist) moveToward(w, u, t.x, t.y, d - it.dist);
      else lookAround(w, u);
      return;
    }
    case "circle": {
      const t = it.target !== undefined ? w.byId.get(it.target) : undefined;
      if (it.target !== undefined && (!t || !t.alive)) return;
      if (t) u.targetId = t.id;
      orbit(w, u, t ?? it, it.dist, 1, false);
      return;
    }
    case "hide": {
      const b = w.nearestBush(u);
      if (b && dist(u, b) > Math.max(4, b.r - u.radius * 1.5)) moveToward(w, u, b.x, b.y, dist(u, b));
      else lookAround(w, u);
      return;
    }
    case "escape":
      escape(w, u);
      return;
  }
}
