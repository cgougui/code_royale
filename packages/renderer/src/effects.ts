import {
  ARENA_W,
  ARENA_H,
  TICKS_PER_SECOND,
  type GameEvent,
  type ItemKind,
  type Team,
  type UnitInfo,
  type UnitSnap,
  type ProjectileSnap,
} from "@code-royale/engine";
import { sfx } from "./audio";
import { TEAM_COLORS, drawStar } from "./sprites";
import { FONT, VIS, type RendererText } from "./view";

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

export class BattleEffects {
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
  constructor(private rng: () => number) {}

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
    const colors =
      team === "blue"
        ? ["#60a5fa", "#93c5fd", "#fde047", "#ffffff", "#a78bfa"]
        : ["#f87171", "#fca5a5", "#fde047", "#fb923c"];
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

  handleEvent(
    e: GameEvent,
    infos: ReadonlyMap<number, UnitInfo>,
    playSound: boolean,
    time: number,
    text: RendererText,
  ) {
    const t = time;
    const s = playSound;
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
        this.burst(
          e.x,
          e.y,
          e.big ? 12 : 6,
          info?.team === "red" ? "#fecaca" : "#dbeafe",
          120,
          2.5,
          "dot",
        );
        if (e.big) this.shake = Math.max(this.shake, 5);
        if (s) sfx.hit(e.big);
        break;
      }
      case "heal": {
        const r = (infos.get(e.id)?.radius ?? 12) * VIS;
        this.floaters.push({
          x: e.x,
          y: e.y - r - 6,
          text: `+${e.amount}`,
          color: "#4ade80",
          size: 15,
          life: 0.9,
          max: 0.9,
          vx: 0,
        });
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
          this.rings.push({
            x: e.x,
            y: e.y,
            r: e.r,
            life: 0.7,
            max: 0.7,
            color: "rgba(253,224,71,0.9)",
            fill: "rgba(253,224,71,0.18)",
            width: 4,
          });
          this.burst(e.x, e.y, 24, "#fde047", 140, 4, "plus");
        } else if (e.kind === "stomp") {
          this.rings.push({
            x: e.x,
            y: e.y,
            r: e.r,
            life: 0.5,
            max: 0.5,
            color: "rgba(214,211,209,0.95)",
            fill: "rgba(120,113,108,0.25)",
            width: 8,
          });
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
          this.burst(
            e.x,
            e.y,
            big ? 45 : 14,
            "#fb923c",
            big ? 260 : 140,
            big ? 6 : 4,
            "dot",
          );
          this.burst(
            e.x,
            e.y,
            big ? 25 : 6,
            "#fde047",
            big ? 200 : 100,
            4,
            "star",
          );
          this.burst(
            e.x,
            e.y,
            big ? 20 : 5,
            "rgba(68,64,60,0.8)",
            80,
            9,
            "smoke",
          );
          this.shake = Math.max(this.shake, big ? 16 : 3);
        }
        if (s) sfx.explode(e.kind);
        break;
      }
      case "whirl":
        this.spin.set(e.id, t);
        this.rings.push({
          x: e.x,
          y: e.y,
          r: e.r,
          life: 0.45,
          max: 0.45,
          color: "rgba(226,232,240,0.95)",
          fill: "rgba(148,163,184,0.2)",
          width: 5,
        });
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
        const label = text.pickup[e.item];
        const color =
          e.item === "potion"
            ? "#f472b6"
            : e.item === "rage"
              ? "#fb923c"
              : "#7dd3fc";
        this.floaters.push({
          x: e.x,
          y: e.y - 30,
          text: label,
          color,
          size: 20,
          life: 1.3,
          max: 1.3,
          vx: 0,
        });
        this.burst(e.x, e.y, 20, color, 180, 4, "star");
        if (s) sfx.pickup();
        break;
      }
      case "special": {
        // Only name your own fighters' moves, so big fights don't turn into a wall of text.
        const info = infos.get(e.id);
        if (info?.team === "blue")
          this.floaters.push({
            x: e.x,
            y: e.y - 40,
            text: text.special(info.type),
            color: "#fde047",
            size: 17,
            life: 1.1,
            max: 1.1,
            vx: 0,
          });
        if (s) sfx.special();
        break;
      }
      case "spawn":
        this.burst(e.x, e.y, 14, "rgba(226,232,240,0.9)", 100, 6, "smoke");
        break;
      case "spotted": {
        // The classic stealth-game "!" when someone gets spotted.
        const blueSaw = e.by === "blue";
        const r = (infos.get(e.id)?.radius ?? 12) * VIS;
        this.floaters.push({
          x: e.x,
          y: e.y - r - 24,
          text: "!",
          color: blueSaw ? "#fde047" : "#f87171",
          size: 30,
          life: 0.9,
          max: 0.9,
          vx: 0,
        });
        if (s) sfx.spotted(blueSaw);
        break;
      }
      case "lost":
        if (e.by === "blue")
          this.floaters.push({
            x: e.x,
            y: e.y - 20,
            text: "?",
            color: "#cbd5e1",
            size: 24,
            life: 1.1,
            max: 1.1,
            vx: 0,
          });
        break;
      case "smoke":
        this.burst(e.x, e.y, 26, "rgba(203,213,225,0.85)", 110, 9, "smoke");
        if (s) sfx.smoke();
        break;
      case "wave":
        this.showBanner(text.wave(e.n), "#fca5a5", text.waveIncoming);
        if (s) sfx.wave();
        break;
    }
  }

  private burst(
    x: number,
    y: number,
    n: number,
    color: string,
    speed: number,
    size: number,
    shape: Particle["shape"],
  ) {
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const v = speed * (0.3 + this.rng() * 0.7);
      const life =
        shape === "smoke" ? 0.6 + this.rng() * 0.5 : 0.35 + this.rng() * 0.4;
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

  shakeOffset(dt: number): { x: number; y: number } {
    this.shake = Math.max(0, this.shake - dt * 30);
    return {
      x: (this.rng() - 0.5) * this.shake,
      y: (this.rng() - 0.5) * this.shake,
    };
  }

  drawGround(ctx: CanvasRenderingContext2D, dt: number): void {
    for (const tomb of this.tombs) {
      tomb.age += dt;
      drawTomb(ctx, tomb, Math.min(1, tomb.age * 3));
    }
  }

  drawWarnings(ctx: CanvasRenderingContext2D, time: number): void {
    for (const warning of this.warns) drawWarn(ctx, warning, time);
  }

  animation(id: number, type: UnitInfo["type"], time: number) {
    const swing = this.swing.get(id);
    const shot = this.shot.get(id);
    const spin = this.spin.get(id);
    return {
      swing:
        swing === undefined
          ? -1
          : (time - swing) / (type === "ogre" ? 0.45 : 0.25),
      shot: shot === undefined ? -1 : (time - shot) / 0.3,
      spin: spin === undefined ? -1 : (time - spin) / 0.45,
      flash: Math.max(0, (this.flash.get(id) ?? 0) / 0.12),
    };
  }

  decayFlashes(dt: number): void {
    for (const [id, value] of this.flash) this.flash.set(id, value - dt);
  }

  footstep(unit: UnitSnap): void {
    if (unit.hidden && unit.moving && this.rng() < 0.15)
      this.burst(unit.x, unit.y, 1, "#4ade80", 40, 2.5, "dot");
  }

  projectileTrail(kind: ProjectileSnap["kind"], x: number, y: number): void {
    if ((kind === "fireball" || kind === "powershot") && this.rng() < 0.7) {
      this.particles.push({
        x,
        y,
        vx: (this.rng() - 0.5) * 30,
        vy: (this.rng() - 0.5) * 30,
        life: 0.3,
        max: 0.3,
        size: kind === "fireball" ? 6 : 3,
        color: kind === "fireball" ? "#fb923c" : "#fde047",
        gravity: 0,
        shape: "dot",
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, dt: number): void {
    this.updateEffects(dt);
    this.drawEffects(ctx);
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
      } else if (p.shape === "plus") {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size * 1.5, p.size, p.size * 3);
        ctx.fillRect(p.x - p.size * 1.5, p.y - p.size / 2, p.size * 3, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(
          p.x,
          p.y,
          p.shape === "smoke" ? p.size * (1.6 - t * 0.6) : p.size * t,
          0,
          Math.PI * 2,
        );
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
      const pop =
        t < 0.15
          ? 0.6 + (t / 0.15) * 0.6
          : 1.2 - Math.min(0.2, (t - 0.15) * 0.5);
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

  drawBanner(ctx: CanvasRenderingContext2D, dt: number) {
    const b = this.banner;
    if (!b) return;
    b.life -= dt;
    if (b.life <= 0) {
      this.banner = null;
      return;
    }
    const t = 1 - b.life / b.max;
    const pop =
      t < 0.12
        ? 0.3 + (t / 0.12) * 0.9
        : t < 0.2
          ? 1.2 - ((t - 0.12) / 0.08) * 0.2
          : 1;
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
function drawGhost(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  team: Team,
) {
  ctx.fillStyle = "rgba(241,245,249,0.9)";
  ctx.beginPath();
  ctx.arc(x, y, 9, Math.PI, 0);
  ctx.lineTo(x + 9, y + 10);
  for (let i = 0; i < 4; i++)
    ctx.lineTo(x + 9 - (i + 0.5) * 4.5, y + (i % 2 === 0 ? 6 : 10));
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
