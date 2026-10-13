/**
 * Combat system: attacks, the built-in fighting footwork, special moves,
 * damage/healing, projectiles and delayed blasts (meteors).
 */
import { clampX, clampY, dist } from "../math/geometry";
import { ARENA_H, ARENA_W, DT, REVEAL_TIME, WALL } from "../rules";
import { orbit } from "./movement";
import type { PendingBlast, Projectile, Unit, World } from "./state";

export function attack(w: World, u: Unit, t: Unit) {
  u.cooldown = u.stats.cooldown * (u.frenzyT > 0 ? 0.45 : 1);
  giveAway(w, u);
  const dmg = u.stats.damage * (u.rageT > 0 ? 2 : 1);
  const proj = u.stats.projectile;
  if (!proj) {
    w.events.push({ k: "swing", id: u.id, angle: u.facing });
    damage(w, u, t, dmg, u.type === "ogre");
    return;
  }
  w.events.push({ k: "shoot", id: u.id, kind: proj });
  const speed = proj === "fireball" ? 300 : proj === "knife" ? 420 : 480;
  w.projectiles.push({
    id: w.newId(),
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

/**
 * Between two attacks fighters don't just stand there: melee fighters back off a
 * step and circle their target, ranged fighters side-step while keeping their distance.
 */
export function footwork(w: World, u: Unit, t: Unit) {
  if (u.type === "ogre") return;
  const ranged = !!u.stats.projectile;
  const gap = ranged ? u.stats.range * 0.75 : u.stats.range + 14;
  orbit(w, u, t, t.radius + u.radius + gap, ranged ? 0.45 : 0.5, true);
}

/** Attacking makes noise: you're revealed in a bush and your smoke bomb wears off. */
function giveAway(w: World, u: Unit) {
  u.revealT = REVEAL_TIME;
  if (u.vanishT > 0) {
    u.vanishT = 0;
    w.events.push({ k: "smoke", id: u.id, x: u.x, y: u.y });
  }
}

export function useSpecial(w: World, u: Unit) {
  const req = u.specialReq!;
  const mult = u.rageT > 0 ? 2 : 1;
  const enemies = w.units.filter((e) => e.alive && e.team !== u.team);
  const visible = enemies.filter((e) => w.spotted[u.team].has(e.id));
  const target = req.target !== undefined ? w.byId.get(req.target) : undefined;
  const nearest = () => visible.reduce<Unit | undefined>((b, e) => (!b || dist(u, e) < dist(u, b) ? e : b), undefined);
  switch (u.type) {
    case "knight": {
      const r = 58;
      giveAway(w, u);
      w.events.push({ k: "whirl", id: u.id, x: u.x, y: u.y, r: u.radius + r });
      for (const e of enemies) if (dist(u, e) - e.radius - u.radius <= r) damage(w, u, e, 32 * mult, true);
      break;
    }
    case "archer": {
      let a: number;
      if (req.x !== undefined && req.y !== undefined) a = Math.atan2(req.y - u.y, req.x - u.x);
      else {
        const t = target?.alive ? target : nearest();
        if (!t) return;
        a = Math.atan2(t.y - u.y, t.x - u.x);
      }
      giveAway(w, u);
      u.facing = a;
      w.events.push({ k: "shoot", id: u.id, kind: "powershot" });
      w.projectiles.push({ id: w.newId(), kind: "powershot", team: u.team, owner: u.id, x: u.x, y: u.y, angle: a, speed: 700, damage: 42 * mult, hits: new Set(), life: 2 });
      break;
    }
    case "scout":
      u.vanishT = 3;
      w.events.push({ k: "smoke", id: u.id, x: u.x, y: u.y });
      break;
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
      giveAway(w, u);
      const ticks = 18;
      w.blasts.push({ ticks, x, y, r: 85, damage: 65 * mult, team: u.team });
      w.events.push({ k: "warn", x, y, r: 85, ticks });
      break;
    }
    case "goblin":
      u.frenzyT = 4;
      break;
    case "ogre": {
      const r = 95;
      giveAway(w, u);
      w.events.push({ k: "explode", x: u.x, y: u.y, r: r + u.radius, kind: "stomp" });
      for (const e of enemies) {
        if (dist(u, e) - e.radius - u.radius > r) continue;
        damage(w, u, e, 40 * mult, true);
        const a = Math.atan2(e.y - u.y, e.x - u.x);
        e.x = clampX(e.x + Math.cos(a) * 45, e.radius);
        e.y = clampY(e.y + Math.sin(a) * 45, e.radius);
      }
      break;
    }
  }
  u.specialCd = u.stats.special.cooldown;
  w.events.push({ k: "special", id: u.id, x: u.x, y: u.y });
}

export function damage(w: World, src: Unit | null, t: Unit, amount: number, big = false) {
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
  // A little push back on every hit, so you can feel it land.
  if (src && dmg > 0 && src.type !== "ogre") {
    const push = (big ? 9 : 3) * Math.min(1, 15 / t.radius);
    const a = Math.atan2(t.y - src.y, t.x - src.x);
    t.x = clampX(t.x + Math.cos(a) * push, t.radius);
    t.y = clampY(t.y + Math.sin(a) * push, t.radius);
  }
  if (src?.team === "blue") w.damageDealt += Math.min(dmg, t.hp + dmg);
  w.events.push({ k: "hit", id: t.id, amount: Math.round(amount), x: t.x, y: t.y, big, blocked });
  if (t.hp <= 0) {
    t.hp = 0;
    t.alive = false;
    if (t.team === "red") w.redKilled++;
    w.events.push({ k: "death", id: t.id, x: t.x, y: t.y, team: t.team });
  }
}

export function heal(w: World, t: Unit, amount: number) {
  const real = Math.min(amount, t.maxHp - t.hp);
  if (real <= 0) return;
  t.hp += real;
  w.events.push({ k: "heal", id: t.id, amount: Math.round(real), x: t.x, y: t.y });
}

export function moveProjectiles(w: World) {
  const keep: Projectile[] = [];
  for (const p of w.projectiles) {
    p.life -= DT;
    const step = p.speed * DT;
    if (p.kind === "powershot") {
      p.x += Math.cos(p.angle) * step;
      p.y += Math.sin(p.angle) * step;
      for (const u of w.units) {
        if (!u.alive || u.team === p.team || p.hits!.has(u.id)) continue;
        if (Math.hypot(u.x - p.x, u.y - p.y) <= u.radius + 10) {
          p.hits!.add(u.id);
          damage(w, w.byId.get(p.owner) ?? null, u, p.damage, true);
        }
      }
      if (p.life > 0 && p.x > 0 && p.x < ARENA_W && p.y > 0 && p.y < ARENA_H) keep.push(p);
      continue;
    }
    const t = p.target !== undefined ? w.byId.get(p.target) : undefined;
    // A target that died or vanished in smoke can't be chased: the shot flies on and fizzles out.
    if (!t || !t.alive || t.vanishT > 0) {
      p.target = undefined;
      p.x += Math.cos(p.angle) * step;
      p.y += Math.sin(p.angle) * step;
      if (p.life > 2.4 && p.x > WALL && p.x < ARENA_W - WALL) keep.push(p);
      continue;
    }
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    p.angle = Math.atan2(t.y - p.y, t.x - p.x);
    if (d <= step + t.radius * 0.5) {
      const owner = w.byId.get(p.owner) ?? null;
      if (p.splash) {
        w.events.push({ k: "explode", x: t.x, y: t.y, r: p.splash, kind: "fire" });
        for (const u of w.units) {
          if (!u.alive || u.team === p.team) continue;
          const dd = Math.hypot(u.x - t.x, u.y - t.y) - u.radius;
          if (u === t) damage(w, owner, u, p.damage);
          else if (dd <= p.splash) damage(w, owner, u, Math.round(p.damage * 0.6));
        }
      } else damage(w, owner, t, p.damage);
      continue;
    }
    p.x += Math.cos(p.angle) * step;
    p.y += Math.sin(p.angle) * step;
    if (p.life > 0) keep.push(p);
  }
  w.projectiles = keep;
}

export function resolveBlasts(w: World) {
  const keep: PendingBlast[] = [];
  for (const b of w.blasts) {
    if (--b.ticks > 0) {
      keep.push(b);
      continue;
    }
    w.events.push({ k: "explode", x: b.x, y: b.y, r: b.r, kind: "meteor" });
    for (const u of w.units) {
      if (!u.alive || u.team === b.team) continue;
      const d = Math.hypot(u.x - b.x, u.y - b.y) - u.radius;
      if (d <= b.r) damage(w, w.units.find((x) => x.team === b.team) ?? null, u, Math.round(b.damage * (1 - Math.max(0, d) / b.r / 2)), true);
    }
  }
  w.blasts = keep;
}
