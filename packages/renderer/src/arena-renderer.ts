/**
 * Draws a battle from engine Frames: terrain, fog of war, fighters, effects and HUD.
 * Stateless with respect to the simulation: it only interpolates between two frames
 * and turns events into particles and sounds.
 */
import { ARENA_W, makeRng, UNIT_STATS } from "@code-royale/engine";
import type {
  Circle,
  Frame,
  GameEvent,
  Team,
  UnitInfo,
  UnitSnap,
} from "@code-royale/engine";
import {
  drawItem,
  drawProjectile,
  drawShadow,
  drawUnit,
  TEAM_COLORS,
} from "./sprites";

import { TerrainLayer } from "./terrain";
import { FogLayer } from "./fog";
import { BattleEffects } from "./effects";
import { drawHud } from "./hud";
import { VIS, type HudInfo, type RendererText, type ViewOptions } from "./view";
import {
  DecisionOverlay,
  drawBars,
  drawFocusRing,
  drawTargetRing,
  barOffset,
  drawSightCircle,
  drawEye,
  drawSlash,
  drawBubble,
  drawTooltip,
} from "./unit-overlays";

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
  private scale = 1;
  private dpr = 1;
  private gameTime = 0;
  private rng = makeRng(42);
  private terrain = new TerrainLayer();
  private fog = new FogLayer();
  private effects = new BattleEffects(this.rng);
  private decisions = new DecisionOverlay();
  mouse: { x: number; y: number } | null = null;
  /** The fighter under the mouse at the last draw, if any. */
  hoveredUnit: number | null = null;
  soundOn = true;

  constructor(
    private canvas: HTMLCanvasElement,
    /** The words to draw, in the player's language. Replace it when the language changes. */
    public text: RendererText,
  ) {
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
    this.mouse =
      cssX === null ? null : { x: cssX / this.scale, y: cssY / this.scale };
  }

  reset() {
    this.effects.reset();
    this.decisions.reset();
  }

  confetti(team: Team) {
    this.effects.confetti(team);
  }
  showBanner(text: string, color: string, sub?: string, dur = 1.6) {
    this.effects.showBanner(text, color, sub, dur);
  }
  handleEvent(
    event: GameEvent,
    infos: ReadonlyMap<number, UnitInfo>,
    playSound: boolean,
  ) {
    this.effects.handleEvent(
      event,
      infos,
      playSound && this.soundOn,
      this.gameTime,
      this.text,
    );
  }

  setTerrain(key: string, bushes: Circle[], rocks: Circle[]) {
    this.terrain.set(key, bushes, rocks);
  }

  draw(
    a: Frame | null,
    b: Frame | null,
    alpha: number,
    infos: ReadonlyMap<number, UnitInfo>,
    dt: number,
    hud: HudInfo | null,
    view: ViewOptions,
  ) {
    this.gameTime += dt;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1a1625";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const k = this.scale * this.dpr;
    const { x: sx, y: sy } = this.effects.shakeOffset(dt);
    ctx.setTransform(k, 0, 0, k, sx * k, sy * k);

    this.terrain.draw(ctx);
    this.effects.drawGround(ctx, dt);

    if (a) {
      const bUnits = new Map<number, UnitSnap>();
      if (b) for (const u of b.units) bUnits.set(u.id, u);

      for (const it of a.items)
        drawItem(ctx, it.kind, it.x, it.y, this.gameTime, it.id);
      this.effects.drawWarnings(ctx, this.gameTime);

      const all = a.units
        .map((u) => {
          const n = bUnits.get(u.id);
          return n
            ? {
                ...u,
                x: lerp(u.x, n.x, alpha),
                y: lerp(u.y, n.y, alpha),
                facing: lerpAngle(u.facing, n.facing, alpha),
                hp: lerp(u.hp, n.hp, alpha),
              }
            : u;
        })
        .sort((p, q) => p.y - q.y);

      // Fog of war: the player only sees what the blue team sees.
      const fogOn = view.fog && !view.preview;
      const blueEyes = all
        .filter((u) => infos.get(u.id)?.team === "blue")
        .map((u) => ({
          x: u.x,
          y: u.y,
          sight: UNIT_STATS[infos.get(u.id)!.type].sight,
        }));
      const units = all.filter((u) => {
        const info = infos.get(u.id);
        return !!info && (!fogOn || info.team === "blue" || u.seen);
      });
      if (fogOn) this.fog.draw(ctx, blueEyes, this.terrain.rocks);
      if (view.preview) {
        // Before the battle: show every blue fighter's detection radius.
        for (const e of blueEyes)
          drawSightCircle(ctx, e.x, e.y, e.sight, "blue", 0.55);
      }

      // Target rings: who is ganging up on whom.
      const byId = new Map(units.map((u) => [u.id, u]));
      const attackers = new Map<number, Record<Team, number>>();
      for (const u of units) {
        if (u.act !== "attack" || u.target === undefined || !byId.has(u.target))
          continue;
        const c = attackers.get(u.target) ?? { blue: 0, red: 0 };
        c[infos.get(u.id)!.team]++;
        attackers.set(u.target, c);
      }
      for (const [id, c] of attackers) {
        const t = byId.get(id)!;
        const r = infos.get(id)!.radius * VIS;
        for (const team of ["blue", "red"] as Team[])
          if (c[team])
            drawTargetRing(ctx, t.x, t.y, r, team, c[team], this.gameTime);
      }
      const focused =
        view.focus !== undefined ? byId.get(view.focus) : undefined;
      if (focused)
        drawFocusRing(
          ctx,
          focused.x,
          focused.y,
          infos.get(focused.id)!.radius * VIS,
          this.gameTime,
        );

      for (const u of units) {
        const info = infos.get(u.id)!;
        if (!u.hidden && !u.vanish)
          drawShadow(ctx, u.x, u.y, info.radius * VIS);
      }
      let hovered: { u: UnitSnap; info: UnitInfo } | null = null;
      for (const u of units) {
        const info = infos.get(u.id)!;
        const animation = this.effects.animation(
          u.id,
          info.type,
          this.gameTime,
        );
        const { swing: sw, shot: sh, spin: sp } = animation;
        // Hidden in a bush or vanished in smoke: drawn see-through, like in most games.
        ctx.globalAlpha = u.vanish
          ? 0.28 + Math.sin(this.gameTime * 20) * 0.08
          : u.hidden
            ? 0.5
            : 1;
        // Melee hits lunge forward a little, then step back.
        const lunge =
          sw >= 0 && sw <= 1 && !UNIT_STATS[info.type].projectile
            ? Math.sin(sw * Math.PI) * (info.type === "ogre" ? 10 : 7)
            : 0;
        drawUnit(ctx, {
          x: u.x + Math.cos(u.facing) * lunge,
          y: u.y + Math.sin(u.facing) * lunge,
          r: info.radius * VIS,
          type: info.type,
          team: info.team,
          facing: u.facing,
          time: this.gameTime,
          seed: u.id * 1.37,
          moving: u.moving,
          swing: sw >= 0 && sw <= 1 ? sw : -1,
          shot: sh >= 0 && sh <= 1 ? sh : -1,
          flash: animation.flash,
          raging: u.raging,
          shield: u.shield,
          spin: sp >= 0 && sp <= 1 ? sp : 0,
        });
        ctx.globalAlpha = 1;
        this.effects.footstep(u);
        if (
          sw >= 0 &&
          sw <= 1 &&
          (info.type === "knight" ||
            info.type === "ogre" ||
            info.type === "goblin")
        )
          drawSlash(ctx, u.x, u.y, info.radius * VIS, u.facing, sw);
        if (
          this.mouse &&
          Math.hypot(this.mouse.x - u.x, this.mouse.y - u.y) <
            info.radius * VIS + 6
        )
          hovered = { u, info };
      }
      this.effects.decayFlashes(dt);

      // Health bars on top of everybody, with an eye when the enemy can see one of yours.
      for (const u of units) {
        const info = infos.get(u.id)!;
        drawBars(ctx, u, info, this.gameTime);
        if (info.team === "blue" && u.seen && !view.preview)
          drawEye(
            ctx,
            u.x,
            u.y - info.radius * VIS - barOffset(info) - 12,
            this.gameTime,
          );
        if (info.team === "blue" && !view.preview)
          this.decisions.draw(ctx, u, info, this.gameTime);
      }

      for (const p of a.projectiles) {
        const n = b?.projectiles.find((q) => q.id === p.id);
        const x = n ? lerp(p.x, n.x, alpha) : p.x;
        const y = n ? lerp(p.y, n.y, alpha) : p.y;
        this.effects.projectileTrail(p.kind, x, y);
        drawProjectile(ctx, p.kind, p.team, x, y, p.angle, this.gameTime);
      }

      for (const u of units) {
        const info = infos.get(u.id)!;
        if (u.say) drawBubble(ctx, u.x, u.y - info.radius * VIS - 26, u.say);
      }
      this.hoveredUnit = hovered?.u.id ?? null;
      // Hovering wins; otherwise the spotlighted fighter shows what it sees.
      if (!hovered && focused)
        hovered = { u: focused, info: infos.get(focused.id)! };
      if (hovered) {
        const tgt =
          hovered.u.target !== undefined
            ? byId.get(hovered.u.target)
            : undefined;
        if (tgt) {
          ctx.save();
          ctx.strokeStyle = TEAM_COLORS[hovered.info.team].light;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -this.gameTime * 30;
          ctx.beginPath();
          ctx.moveTo(hovered.u.x, hovered.u.y);
          ctx.lineTo(tgt.x, tgt.y);
          ctx.stroke();
          ctx.restore();
        }
        const stats = UNIT_STATS[hovered.info.type];
        drawSightCircle(
          ctx,
          hovered.u.x,
          hovered.u.y,
          stats.sight,
          hovered.info.team,
          1,
          this.text.detectionRadius(stats.sight),
        );
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(
          hovered.u.x,
          hovered.u.y,
          stats.range + hovered.info.radius,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        drawTooltip(
          ctx,
          hovered.u,
          hovered.info,
          this.text,
          tgt ? infos.get(tgt.id)?.name : undefined,
        );
      }
    }

    this.effects.draw(ctx, dt);
    if (hud) drawHud(ctx, a, infos, hud, this.text);
    this.effects.drawBanner(ctx, dt);
  }
}
