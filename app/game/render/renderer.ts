import { sfx } from "../audio";
import { ARENA_H, ARENA_W, TICKS_PER_SECOND, UNIT_STATS, WALL } from "../constants";
import { makeRng } from "../rng";
import type { Frame, GameEvent, ItemKind, Team, UnitInfo, UnitSnap } from "../types";
import { drawItem, drawProjectile, drawShadow, drawStar, drawUnit, TEAM_COLORS } from "./sprites";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
  shape: "dot" | "star" | "plus" | "smoke" | "confetti";
  spin?: number;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  max: number;
  vx: number;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
  color: string;
  fill?: string;
  width: number;
}

interface Warn {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
}

interface Tomb {
  x: number;
  y: number;
  team: Team;
  age: number;
}

interface Ghost {
  x: number;
  y: number;
  team: Team;
  life: number;
}

interface Banner {
  text: string;
  sub?: string;
  color: string;
  life: number;
  max: number;
}

export interface HudInfo {
  time: number;
  timeLimit: number;
  wave?: number;
  speed: number;
}

const FONT = "Fredoka, system-ui, sans-serif";
/** Fighters are drawn a bit bigger than their hit circle so kids can see them well. */
export const VIS = 1.35;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export class ArenaRenderer {
  private ctx: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement | null = null;
  private scale = 1;
  private dpr = 1;
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private rings: Ring[] = [];
  private warns: Warn[] = [];
  private tombs: Tomb[] = [];
  private ghosts: Ghost[] = [];
  private banner: Banner | null = null;
  private flash = new Map<number, number>();
  private swing = new Map<number, number>();
  private shot = new Map<number, number>();
  private spin = new Map<number, number>();
  private pickupGlow = new Map<number, { kind: ItemKind; t: number }>();
  private shake = 0;
  private gameTime = 0;
  private rng = makeRng(42);
  mouse: { x: number; y: number } | null = null;
  soundOn = true;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  resize(cssW: number, cssH: number) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.scale = cssW / ARENA_W;
  }

  /** Converts a mouse position (CSS pixels) to arena coordinates. */
  setMouse(cssX: number | null, cssY = 0) {
    this.mouse = cssX === null ? null : { x: cssX / this.scale, y: cssY / this.scale };
  }

  reset() {
    this.particles = [];
    this.floaters = [];
    this.rings = [];
    this.warns = [];
    this.tombs = [];
    this.ghosts = [];
    this.banner = null;
    this.flash.clear();
    this.swing.clear();
    this.shot.clear();
    this.spin.clear();
    this.pickupGlow.clear();
    this.shake = 0;
  }

  /** Throws confetti in the team's colours. */
  confetti(team: Team) {
    const colors = team === "blue" ? ["#60a5fa", "#93c5fd", "#fde047", "#ffffff", "#a78bfa"] : ["#f87171", "#fca5a5", "#fde047", "#fb923c"];
    for (let i = 0; i < 160; i++) {
      const life = 1.8 + this.rng() * 1.6;
      this.particles.push({
        x: this.rng() * ARENA_W,
        y: -20 - this.rng() * 200,
        vx: (this.rng() - 0.5) * 80,
        vy: 60 + this.rng() * 120,
        life,
        max: life,
        size: 3 + this.rng() * 3,
        color: colors[Math.floor(this.rng() * colors.length)],
        gravity: 40,
        shape: "confetti",
        spin: this.rng() * 10,
      });
    }
  }

  showBanner(text: string, color: string, sub?: string, dur = 1.6) {
    this.banner = { text, sub, color, life: dur, max: dur };
  }

  // ------------------------------------------------------------ events

  handleEvent(e: GameEvent, infos: Map<number, UnitInfo>, playSound: boolean) {
    const t = this.gameTime;
    const s = playSound && this.soundOn;
    switch (e.k) {
      case "swing":
        this.swing.set(e.id, t);
        if (s) sfx.swing();
        break;
      case "shoot":
        this.shot.set(e.id, t);
        if (s) sfx.shoot(e.kind);
        break;
      case "hit": {
        this.flash.set(e.id, 0.12);
        const info = infos.get(e.id);
        const r = (info?.radius ?? 12) * VIS;
        this.floaters.push({
          x: e.x + (this.rng() - 0.5) * 10,
          y: e.y - r - 6,
          text: e.blocked ? "🛡" : `-${e.amount}`,
          color: e.blocked ? "#7dd3fc" : e.big ? "#fde047" : "#ffffff",
          size: e.big ? 22 : 15,
          life: 0.9,
          max: 0.9,
          vx: (this.rng() - 0.5) * 30,
        });
        this.burst(e.x, e.y, e.big ? 12 : 6, info?.team === "red" ? "#fecaca" : "#dbeafe", 120, 2.5, "dot");
        if (e.big) this.shake = Math.max(this.shake, 5);
        if (s) sfx.hit(e.big);
        break;
      }
      case "heal": {
        const r = (infos.get(e.id)?.radius ?? 12) * VIS;
        this.floaters.push({ x: e.x, y: e.y - r - 6, text: `+${e.amount}`, color: "#4ade80", size: 15, life: 0.9, max: 0.9, vx: 0 });
        for (let i = 0; i < 5; i++) {
          this.particles.push({
            x: e.x + (this.rng() - 0.5) * r * 2,
            y: e.y + (this.rng() - 0.3) * r,
            vx: 0,
            vy: -30 - this.rng() * 30,
            life: 0.8,
            max: 0.8,
            size: 4,
            color: "#4ade80",
            gravity: 0,
            shape: "plus",
          });
        }
        if (s) sfx.heal();
        break;
      }
      case "death": {
        this.burst(e.x, e.y, 22, "rgba(226,232,240,0.9)", 90, 7, "smoke");
        this.burst(e.x, e.y, 10, TEAM_COLORS[e.team].light, 160, 3, "star");
        this.ghosts.push({ x: e.x, y: e.y, team: e.team, life: 1.4 });
        this.tombs.push({ x: e.x, y: e.y, team: e.team, age: 0 });
        this.shake = Math.max(this.shake, 4);
        if (s) sfx.death(e.team);
        break;
      }
      case "explode": {
        if (e.kind === "holy") {
          this.rings.push({ x: e.x, y: e.y, r: e.r, life: 0.7, max: 0.7, color: "rgba(253,224,71,0.9)", fill: "rgba(253,224,71,0.18)", width: 4 });
          this.burst(e.x, e.y, 24, "#fde047", 140, 4, "plus");
        } else if (e.kind === "stomp") {
          this.rings.push({ x: e.x, y: e.y, r: e.r, life: 0.5, max: 0.5, color: "rgba(214,211,209,0.95)", fill: "rgba(120,113,108,0.25)", width: 8 });
          this.burst(e.x, e.y, 30, "rgba(168,162,158,0.9)", 220, 6, "smoke");
          this.shake = Math.max(this.shake, 14);
        } else {
          const big = e.kind === "meteor";
          this.rings.push({
            x: e.x,
            y: e.y,
            r: e.r,
            life: big ? 0.6 : 0.35,
            max: big ? 0.6 : 0.35,
            color: "rgba(251,146,60,0.95)",
            fill: "rgba(249,115,22,0.3)",
            width: big ? 8 : 4,
          });
          this.burst(e.x, e.y, big ? 45 : 14, "#fb923c", big ? 260 : 140, big ? 6 : 4, "dot");
          this.burst(e.x, e.y, big ? 25 : 6, "#fde047", big ? 200 : 100, 4, "star");
          this.burst(e.x, e.y, big ? 20 : 5, "rgba(68,64,60,0.8)", 80, 9, "smoke");
          this.shake = Math.max(this.shake, big ? 16 : 3);
        }
        if (s) sfx.explode(e.kind);
        break;
      }
      case "whirl":
        this.spin.set(e.id, t);
        this.rings.push({ x: e.x, y: e.y, r: e.r, life: 0.45, max: 0.45, color: "rgba(226,232,240,0.95)", fill: "rgba(148,163,184,0.2)", width: 5 });
        this.burst(e.x, e.y, 16, "#e2e8f0", 200, 3, "dot");
        this.shake = Math.max(this.shake, 6);
        if (s) sfx.whirl();
        break;
      case "warn": {
        const dur = e.ticks / TICKS_PER_SECOND;
        this.warns.push({ x: e.x, y: e.y, r: e.r, life: dur, max: dur });
        if (s) sfx.warn();
        break;
      }
      case "pickup": {
        this.pickupGlow.set(e.id, { kind: e.item, t });
        const label = e.item === "potion" ? "+HEALTH!" : e.item === "rage" ? "RAGE!" : "SHIELD!";
        const color = e.item === "potion" ? "#f472b6" : e.item === "rage" ? "#fb923c" : "#7dd3fc";
        this.floaters.push({ x: e.x, y: e.y - 30, text: label, color, size: 20, life: 1.3, max: 1.3, vx: 0 });
        this.burst(e.x, e.y, 20, color, 180, 4, "star");
        if (s) sfx.pickup();
        break;
      }
      case "special": {
        this.floaters.push({ x: e.x, y: e.y - 40, text: `${e.name.toUpperCase()}!`, color: "#fde047", size: 17, life: 1.1, max: 1.1, vx: 0 });
        if (s) sfx.special();
        break;
      }
      case "spawn":
        this.burst(e.x, e.y, 14, "rgba(226,232,240,0.9)", 100, 6, "smoke");
        break;
      case "wave":
        this.showBanner(`WAVE ${e.n}`, "#fca5a5", "Here they come!");
        if (s) sfx.wave();
        break;
    }
  }

  private burst(x: number, y: number, n: number, color: string, speed: number, size: number, shape: Particle["shape"]) {
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const v = speed * (0.3 + this.rng() * 0.7);
      const life = shape === "smoke" ? 0.6 + this.rng() * 0.5 : 0.35 + this.rng() * 0.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - (shape === "smoke" ? 30 : 0),
        life,
        max: life,
        size: size * (0.6 + this.rng() * 0.6),
        color,
        gravity: shape === "dot" ? 300 : 0,
        shape,
        spin: this.rng() * 6,
      });
    }
  }

  // ------------------------------------------------------------ drawing

  draw(a: Frame | null, b: Frame | null, alpha: number, infos: Map<number, UnitInfo>, dt: number, hud: HudInfo | null) {
    this.gameTime += dt;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1a1625";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const k = this.scale * this.dpr;
    this.shake = Math.max(0, this.shake - dt * 30);
    const sx = (this.rng() - 0.5) * this.shake;
    const sy = (this.rng() - 0.5) * this.shake;
    ctx.setTransform(k, 0, 0, k, sx * k, sy * k);

    if (!this.bg) this.bg = buildBackground();
    ctx.drawImage(this.bg, 0, 0, ARENA_W, ARENA_H);

    // Tombstones left behind.
    for (const t of this.tombs) {
      t.age += dt;
      drawTomb(ctx, t, Math.min(1, t.age * 3));
    }

    if (a) {
      const bUnits = new Map<number, UnitSnap>();
      if (b) for (const u of b.units) bUnits.set(u.id, u);

      for (const it of a.items) drawItem(ctx, it.kind, it.x, it.y, this.gameTime, it.id);

      // Meteor warnings.
      for (const w of this.warns) drawWarn(ctx, w, this.gameTime);

      const units = a.units
        .map((u) => {
          const n = bUnits.get(u.id);
          return n
            ? { ...u, x: lerp(u.x, n.x, alpha), y: lerp(u.y, n.y, alpha), facing: lerpAngle(u.facing, n.facing, alpha), hp: lerp(u.hp, n.hp, alpha) }
            : u;
        })
        .sort((p, q) => p.y - q.y);

      for (const u of units) {
        const info = infos.get(u.id);
        if (info) drawShadow(ctx, u.x, u.y, info.radius * VIS);
      }
      let hovered: { u: UnitSnap; info: UnitInfo } | null = null;
      for (const u of units) {
        const info = infos.get(u.id);
        if (!info) continue;
        const swingT = this.swing.get(u.id);
        const shotT = this.shot.get(u.id);
        const spinT = this.spin.get(u.id);
        const sw = swingT !== undefined ? (this.gameTime - swingT) / (info.type === "ogre" ? 0.45 : 0.25) : -1;
        const sh = shotT !== undefined ? (this.gameTime - shotT) / 0.3 : -1;
        const sp = spinT !== undefined ? (this.gameTime - spinT) / 0.45 : -1;
        drawUnit(ctx, {
          x: u.x,
          y: u.y,
          r: info.radius * VIS,
          type: info.type,
          team: info.team,
          facing: u.facing,
          time: this.gameTime,
          seed: u.id * 1.37,
          moving: u.moving,
          swing: sw >= 0 && sw <= 1 ? sw : -1,
          shot: sh >= 0 && sh <= 1 ? sh : -1,
          flash: Math.max(0, (this.flash.get(u.id) ?? 0) / 0.12),
          raging: u.raging,
          shield: u.shield,
          spin: sp >= 0 && sp <= 1 ? sp : 0,
        });
        if (sw >= 0 && sw <= 1 && (info.type === "knight" || info.type === "ogre" || info.type === "goblin")) drawSlash(ctx, u.x, u.y, info.radius * VIS, u.facing, sw);
        if (this.mouse && Math.hypot(this.mouse.x - u.x, this.mouse.y - u.y) < info.radius * VIS + 6) hovered = { u, info };
      }
      for (const [id, v] of this.flash) this.flash.set(id, v - dt);

      // Health bars and speech on top of everybody.
      for (const u of units) {
        const info = infos.get(u.id);
        if (info) drawBars(ctx, u, info, this.gameTime);
      }

      for (const p of a.projectiles) {
        const n = b?.projectiles.find((q) => q.id === p.id);
        const x = n ? lerp(p.x, n.x, alpha) : p.x;
        const y = n ? lerp(p.y, n.y, alpha) : p.y;
        if (p.kind === "fireball" || p.kind === "powershot") {
          if (this.rng() < 0.7) {
            this.particles.push({
              x,
              y,
              vx: (this.rng() - 0.5) * 30,
              vy: (this.rng() - 0.5) * 30,
              life: 0.3,
              max: 0.3,
              size: p.kind === "fireball" ? 6 : 3,
              color: p.kind === "fireball" ? "#fb923c" : "#fde047",
              gravity: 0,
              shape: "dot",
            });
          }
        }
        drawProjectile(ctx, p.kind, p.team, x, y, p.angle, this.gameTime);
      }

      for (const u of units) {
        const info = infos.get(u.id);
        if (info && u.say) drawBubble(ctx, u.x, u.y - info.radius * VIS - 26, u.say);
      }
      if (hovered) drawTooltip(ctx, hovered.u, hovered.info);
    }

    this.updateEffects(dt);
    this.drawEffects(ctx);
    if (hud) this.drawHud(ctx, a, infos, hud);
    this.drawBanner(ctx, dt);
  }

  private updateEffects(dt: number) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.shape === "smoke") {
        p.vx *= 0.92;
        p.vy *= 0.92;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= dt * 40;
      f.x += f.vx * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const w of this.warns) w.life -= dt;
    this.warns = this.warns.filter((w) => w.life > 0);
    for (const g of this.ghosts) g.life -= dt;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
  }

  private drawEffects(ctx: CanvasRenderingContext2D) {
    for (const r of this.rings) {
      const t = 1 - r.life / r.max;
      const rad = r.r * (0.3 + 0.7 * Math.sqrt(t));
      ctx.globalAlpha = 1 - t;
      if (r.fill) {
        ctx.fillStyle = r.fill;
        ctx.beginPath();
        ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - t * 0.5);
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const p of this.particles) {
      const t = p.life / p.max;
      ctx.globalAlpha = Math.min(1, t * 1.5);
      ctx.fillStyle = p.color;
      if (p.shape === "star") drawStar(ctx, p.x, p.y, p.size, p.color);
      else if (p.shape === "confetti") {
        const w = Math.abs(Math.cos((p.spin ?? 0) + p.life * 8)) * p.size * 2;
        ctx.fillRect(p.x - w / 2, p.y - p.size / 2, w, p.size);
      }
      else if (p.shape === "plus") {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size * 1.5, p.size, p.size * 3);
        ctx.fillRect(p.x - p.size * 1.5, p.y - p.size / 2, p.size * 3, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.shape === "smoke" ? p.size * (1.6 - t * 0.6) : p.size * t, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    for (const g of this.ghosts) {
      const t = 1 - g.life / 1.4;
      ctx.globalAlpha = (1 - t) * 0.85;
      drawGhost(ctx, g.x + Math.sin(t * 10) * 4, g.y - 10 - t * 50, g.team);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of this.floaters) {
      if (!f.text) continue;
      const t = 1 - f.life / f.max;
      const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.6 : 1.2 - Math.min(0.2, (t - 0.15) * 0.5);
      ctx.globalAlpha = Math.min(1, (f.life / f.max) * 2.5);
      ctx.font = `700 ${Math.round(f.size * pop)}px ${FONT}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(15,10,25,0.85)";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  private drawHud(ctx: CanvasRenderingContext2D, frame: Frame | null, infos: Map<number, UnitInfo>, hud: HudInfo) {
    const totals = { blue: { hp: 0, max: 0, alive: 0 }, red: { hp: 0, max: 0, alive: 0 } };
    // With waves, the red bar only measures the wave on the field right now.
    for (const info of infos.values()) if (info.team === "blue" || hud.wave === undefined) totals[info.team].max += info.maxHp;
    if (frame) {
      for (const u of frame.units) {
        const info = infos.get(u.id);
        if (!info) continue;
        totals[info.team].hp += u.hp;
        totals[info.team].alive++;
        if (info.team === "red" && hud.wave !== undefined) totals.red.max += info.maxHp;
      }
    }
    const barW = 230;
    const y = 6;
    for (const team of ["blue", "red"] as Team[]) {
      const x = team === "blue" ? 14 : ARENA_W - 14 - barW;
      const c = TEAM_COLORS[team];
      roundRect(ctx, x, y, barW, 18, 9);
      ctx.fillStyle = "rgba(15,10,25,0.75)";
      ctx.fill();
      const ratio = totals[team].max ? totals[team].hp / totals[team].max : 0;
      const w = (barW - 4) * ratio;
      if (w > 0) {
        roundRect(ctx, team === "blue" ? x + 2 : x + 2 + (barW - 4 - w), y + 2, w, 14, 7);
        const g = ctx.createLinearGradient(0, y, 0, y + 18);
        g.addColorStop(0, c.light);
        g.addColorStop(1, c.base);
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.font = `700 12px ${FONT}`;
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.textAlign = team === "blue" ? "left" : "right";
      const label = `${team === "blue" ? "BLUE" : "RED"} · ${totals[team].alive} ${totals[team].alive === 1 ? "fighter" : "fighters"}`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.strokeText(label, team === "blue" ? x + 10 : x + barW - 10, y + 9.5);
      ctx.fillText(label, team === "blue" ? x + 10 : x + barW - 10, y + 9.5);
    }

    // Timer.
    const remaining = Math.max(0, hud.timeLimit - hud.time);
    const label = hud.wave !== undefined ? `WAVE ${hud.wave} · ${fmtTime(hud.time)}` : fmtTime(remaining);
    ctx.font = `700 15px ${FONT}`;
    const tw = ctx.measureText(label).width + 28;
    roundRect(ctx, ARENA_W / 2 - tw / 2, 3, tw, 23, 11.5);
    ctx.fillStyle = hud.wave === undefined && remaining < 10 ? "rgba(185,28,28,0.9)" : "rgba(15,10,25,0.8)";
    ctx.fill();
    ctx.strokeStyle = "rgba(250,204,21,0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#fde68a";
    ctx.textAlign = "center";
    ctx.fillText(label, ARENA_W / 2, 15);

    if (hud.speed !== 1) {
      ctx.font = `700 13px ${FONT}`;
      ctx.fillStyle = "rgba(253,230,138,0.9)";
      ctx.textAlign = "center";
      ctx.fillText(hud.speed < 1 ? "slow-mo" : `${hud.speed}× speed`, ARENA_W / 2, ARENA_H - 13);
    }
  }

  private drawBanner(ctx: CanvasRenderingContext2D, dt: number) {
    const b = this.banner;
    if (!b) return;
    b.life -= dt;
    if (b.life <= 0) {
      this.banner = null;
      return;
    }
    const t = 1 - b.life / b.max;
    const pop = t < 0.12 ? 0.3 + (t / 0.12) * 0.9 : t < 0.2 ? 1.2 - ((t - 0.12) / 0.08) * 0.2 : 1;
    const alpha = b.life < 0.3 ? b.life / 0.3 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ARENA_W / 2, ARENA_H / 2 - 30);
    ctx.scale(pop, pop);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 64px ${FONT}`;
    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(20,10,30,0.85)";
    ctx.strokeText(b.text, 0, 0);
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, 0, 0);
    if (b.sub) {
      ctx.font = `600 22px ${FONT}`;
      ctx.lineWidth = 6;
      ctx.strokeText(b.sub, 0, 48);
      ctx.fillStyle = "#fff";
      ctx.fillText(b.sub, 0, 48);
    }
    ctx.restore();
  }
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawBars(ctx: CanvasRenderingContext2D, u: UnitSnap, info: UnitInfo, time: number) {
  const r = info.radius * VIS;
  const w = Math.max(28, r * 2);
  const x = u.x - w / 2;
  const y = u.y - r - (info.type === "mage" ? 30 : info.type === "healer" ? 24 : info.type === "knight" ? 18 : 14);
  const ratio = Math.max(0, u.hp / info.maxHp);
  roundRect(ctx, x - 1.5, y - 1.5, w + 3, 7, 3.5);
  ctx.fillStyle = "rgba(15,10,25,0.8)";
  ctx.fill();
  if (ratio > 0) {
    roundRect(ctx, x, y, w * ratio, 4, 2);
    ctx.fillStyle = ratio > 0.6 ? "#4ade80" : ratio > 0.3 ? "#facc15" : "#f87171";
    ctx.fill();
  }
  // Team marker on the left of the bar.
  ctx.fillStyle = TEAM_COLORS[info.team].base;
  ctx.beginPath();
  ctx.arc(x - 4, y + 2, 3.5, 0, Math.PI * 2);
  ctx.fill();
  if (u.specialReady) {
    const pulse = 0.75 + Math.sin(time * 6 + info.id) * 0.25;
    drawStar(ctx, x + w + 6, y + 2, 5 * pulse, "#fde047");
  }
}

function drawSlash(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, facing: number, t: number) {
  if (t < 0.3) return;
  const p = (t - 0.3) / 0.7;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  ctx.globalAlpha = 1 - p;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4 * (1 - p) + 1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 0, r + 10 + p * 6, -1.0 + p * 0.3, 1.0 * p + 0.2);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.font = `600 12px ${FONT}`;
  const w = Math.min(200, ctx.measureText(text).width + 16);
  const h = 22;
  const bx = Math.max(WALL, Math.min(ARENA_W - WALL - w, x - w / 2));
  const by = Math.max(30, y - h);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#1e1b4b";
  ctx.lineWidth = 2;
  roundRect(ctx, bx, by, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 5, by + h - 1);
  ctx.lineTo(x, by + h + 7);
  ctx.lineTo(x + 5, by + h - 1);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 5, by + h);
  ctx.lineTo(x, by + h + 7);
  ctx.lineTo(x + 5, by + h);
  ctx.stroke();
  ctx.fillStyle = "#1e1b4b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, bx + w / 2, by + h / 2 + 1, w - 10);
}

function drawTooltip(ctx: CanvasRenderingContext2D, u: UnitSnap, info: UnitInfo) {
  const lines = [`${info.name} the ${UNIT_STATS[info.type].label}`, `❤ ${Math.ceil(u.hp)} / ${info.maxHp}   id ${info.id}`];
  ctx.font = `600 12px ${FONT}`;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18;
  const h = 40;
  const x = Math.max(WALL, Math.min(ARENA_W - WALL - w, u.x + info.radius * VIS + 8));
  const y = Math.max(WALL, Math.min(ARENA_H - WALL - h, u.y - h / 2));
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = "rgba(15,10,25,0.9)";
  ctx.fill();
  ctx.strokeStyle = TEAM_COLORS[info.team].base;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(lines[0], x + 9, y + 13);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(lines[1], x + 9, y + 28);
}

function drawGhost(ctx: CanvasRenderingContext2D, x: number, y: number, team: Team) {
  ctx.fillStyle = "rgba(241,245,249,0.9)";
  ctx.beginPath();
  ctx.arc(x, y, 9, Math.PI, 0);
  ctx.lineTo(x + 9, y + 10);
  for (let i = 0; i < 4; i++) ctx.lineTo(x + 9 - (i + 0.5) * 4.5, y + (i % 2 === 0 ? 6 : 10));
  ctx.lineTo(x - 9, y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = TEAM_COLORS[team].dark;
  ctx.beginPath();
  ctx.arc(x - 3, y - 1, 1.8, 0, Math.PI * 2);
  ctx.arc(x + 3, y - 1, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawTomb(ctx: CanvasRenderingContext2D, t: Tomb, appear: number) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.translate(t.x, t.y + 6);
  ctx.scale(appear, appear);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 8, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a8a29e";
  ctx.strokeStyle = "#44403c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-7, 8);
  ctx.lineTo(-7, -4);
  ctx.arc(0, -4, 7, Math.PI, 0);
  ctx.lineTo(7, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = TEAM_COLORS[t.team].base;
  ctx.fillRect(-1.2, -7, 2.4, 9);
  ctx.fillRect(-3.5, -4.5, 7, 2.4);
  ctx.restore();
}

function drawWarn(ctx: CanvasRenderingContext2D, w: Warn, time: number) {
  const t = 1 - w.life / w.max;
  ctx.save();
  ctx.strokeStyle = `rgba(239,68,68,${0.5 + Math.sin(time * 25) * 0.4})`;
  ctx.fillStyle = `rgba(239,68,68,${0.08 + t * 0.2})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.lineDashOffset = -time * 40;
  ctx.beginPath();
  ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  // The meteor falling from the sky.
  const fall = Math.max(0, (t - 0.35) / 0.65);
  if (fall > 0) {
    const mx = w.x + (1 - fall) * 160;
    const my = w.y - (1 - fall) * 320;
    const s = 10 + fall * 18;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, s * 1.8);
    g.addColorStop(0, "#fff7ed");
    g.addColorStop(0.35, "#fb923c");
    g.addColorStop(1, "rgba(220,38,38,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my, s * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#57534e";
    ctx.beginPath();
    ctx.arc(mx, my, s * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Paints the static arena once: grass, chalk lines, flowers and stone walls. */
function buildBackground(): HTMLCanvasElement {
  const S = 2;
  const c = document.createElement("canvas");
  c.width = ARENA_W * S;
  c.height = ARENA_H * S;
  const ctx = c.getContext("2d")!;
  ctx.scale(S, S);
  const rng = makeRng(7);

  // Grass with mowed stripes.
  ctx.fillStyle = "#4d9a3f";
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  for (let i = 0; i < ARENA_W / 60; i++) {
    if (i % 2) continue;
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    ctx.fillRect(i * 60, 0, 60, ARENA_H);
  }
  // Soft noise.
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = rng() < 0.5 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)";
    ctx.fillRect(rng() * ARENA_W, rng() * ARENA_H, 2 + rng() * 3, 2 + rng() * 3);
  }
  // Team zones.
  const zl = ctx.createLinearGradient(0, 0, 260, 0);
  zl.addColorStop(0, "rgba(59,130,246,0.22)");
  zl.addColorStop(1, "rgba(59,130,246,0)");
  ctx.fillStyle = zl;
  ctx.fillRect(0, 0, 260, ARENA_H);
  const zr = ctx.createLinearGradient(ARENA_W, 0, ARENA_W - 260, 0);
  zr.addColorStop(0, "rgba(239,68,68,0.22)");
  zr.addColorStop(1, "rgba(239,68,68,0)");
  ctx.fillStyle = zr;
  ctx.fillRect(ARENA_W - 260, 0, 260, ARENA_H);

  // Chalk lines.
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ARENA_W / 2, WALL);
  ctx.lineTo(ARENA_W / 2, ARENA_H - WALL);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ARENA_W / 2, ARENA_H / 2, 70, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.arc(ARENA_W / 2, ARENA_H / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // Grass tufts & flowers.
  for (let i = 0; i < 140; i++) {
    const x = WALL + rng() * (ARENA_W - WALL * 2);
    const y = WALL + rng() * (ARENA_H - WALL * 2);
    if (rng() < 0.75) {
      ctx.strokeStyle = rng() < 0.5 ? "#3f8a32" : "#6bbf55";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let j = -1; j <= 1; j++) {
        ctx.moveTo(x + j * 2, y);
        ctx.lineTo(x + j * 4, y - 5 - rng() * 3);
      }
      ctx.stroke();
    } else {
      const colors = ["#fef08a", "#f9a8d4", "#ffffff", "#c4b5fd"];
      ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 2.5, y + Math.sin(a) * 2.5, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Inner shadow along the walls.
  const sh = 18;
  const edges: [number, number, number, number, number, number, number, number][] = [
    [WALL, WALL, ARENA_W - WALL * 2, sh, 0, WALL, 0, WALL + sh],
    [WALL, ARENA_H - WALL - sh, ARENA_W - WALL * 2, sh, 0, ARENA_H - WALL, 0, ARENA_H - WALL - sh],
    [WALL, WALL, sh, ARENA_H - WALL * 2, WALL, 0, WALL + sh, 0],
    [ARENA_W - WALL - sh, WALL, sh, ARENA_H - WALL * 2, ARENA_W - WALL, 0, ARENA_W - WALL - sh, 0],
  ];
  for (const [x, y, w, h, x0, y0, x1, y1] of edges) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "rgba(0,0,0,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }

  // Stone walls.
  const drawWall = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = "#6b6478";
    ctx.fillRect(x, y, w, h);
    const bw = 34;
    const bh = WALL / 2;
    for (let row = 0; row * bh < h; row++) {
      for (let col = -1; col * bw < w; col++) {
        const bx = x + col * bw + (row % 2 ? bw / 2 : 0);
        const by = y + row * bh;
        const shade = 0.85 + rng() * 0.3;
        ctx.fillStyle = `rgb(${Math.round(120 * shade)},${Math.round(112 * shade)},${Math.round(135 * shade)})`;
        const cx = Math.max(x, bx + 1);
        const cw = Math.min(x + w, bx + bw - 1) - cx;
        const ch = Math.min(y + h, by + bh - 1) - (by + 1);
        if (cw > 0 && ch > 0) ctx.fillRect(cx, by + 1, cw, ch);
      }
    }
  };
  drawWall(0, 0, ARENA_W, WALL);
  drawWall(0, ARENA_H - WALL, ARENA_W, WALL);
  drawWall(0, WALL, WALL, ARENA_H - WALL * 2);
  drawWall(ARENA_W - WALL, WALL, WALL, ARENA_H - WALL * 2);
  ctx.strokeStyle = "#2e2838";
  ctx.lineWidth = 3;
  ctx.strokeRect(WALL - 1.5, WALL - 1.5, ARENA_W - WALL * 2 + 3, ARENA_H - WALL * 2 + 3);

  // Corner towers with banners.
  for (const [x, y, team] of [
    [WALL / 2, WALL / 2, "blue"],
    [WALL / 2, ARENA_H - WALL / 2, "blue"],
    [ARENA_W - WALL / 2, WALL / 2, "red"],
    [ARENA_W - WALL / 2, ARENA_H - WALL / 2, "red"],
  ] as [number, number, Team][]) {
    ctx.fillStyle = "#4b4458";
    ctx.strokeStyle = "#2e2838";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#8a8299";
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = TEAM_COLORS[team].base;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 13);
    ctx.lineTo(x + 12, y - 8);
    ctx.lineTo(x - 2, y - 3);
    ctx.fill();
    ctx.strokeStyle = "#e7e5e4";
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 14);
    ctx.lineTo(x - 2, y + 8);
    ctx.stroke();
  }
  return c;
}
