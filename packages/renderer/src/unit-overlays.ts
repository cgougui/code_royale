import {
  ARENA_H,
  ARENA_W,
  WALL,
  UNIT_STATS,
  type Team,
  type UnitInfo,
  type UnitSnap,
} from "@code-royale/engine";
import { TEAM_COLORS, drawStar } from "./sprites";
import { FONT, VIS, ACT_ICONS, type RendererText } from "./view";
import { roundRect } from "./canvas";

export class DecisionOverlay {
  private decisions = new Map<
    number,
    { act: string; since: number; shown: string; popT: number }
  >();
  reset(): void {
    this.decisions.clear();
  }

  /** Pops a little icon above your fighter each time your code changes what it does. */
  draw(
    ctx: CanvasRenderingContext2D,
    u: UnitSnap,
    info: UnitInfo,
    now: number,
  ) {
    let d = this.decisions.get(u.id);
    if (!d) {
      d = { act: u.act, since: now, shown: "", popT: -10 };
      this.decisions.set(u.id, d);
    }
    if (d.act !== u.act) {
      d.act = u.act;
      d.since = now;
    }
    // Only pop once the decision has stuck for a moment, so flip-flopping doesn't spam icons.
    if (d.shown !== d.act && now - d.since > 0.25 && now - d.popT > 0.6) {
      d.shown = d.act;
      d.popT = now;
    }
    const age = now - d.popT;
    if (age > 1.4) return;
    const icon = ACT_ICONS[d.shown];
    if (!icon) return;
    const pop =
      age < 0.15
        ? 0.4 + (age / 0.15) * 0.8
        : age < 0.25
          ? 1.2 - ((age - 0.15) / 0.1) * 0.2
          : 1;
    const alpha = age > 1.1 ? (1.4 - age) / 0.3 : 1;
    const x = u.x + info.radius * VIS + 12;
    const y = u.y - info.radius * VIS - 8;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(pop, pop);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.strokeStyle = TEAM_COLORS[info.team].dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = `16px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, 0, 1);
    ctx.restore();
  }
}

export function drawBars(
  ctx: CanvasRenderingContext2D,
  u: UnitSnap,
  info: UnitInfo,
  time: number,
) {
  const r = info.radius * VIS;
  const w = Math.max(28, r * 2);
  const x = u.x - w / 2;
  const y = u.y - r - barOffset(info);
  const ratio = Math.max(0, u.hp / info.maxHp);
  roundRect(ctx, x - 1.5, y - 1.5, w + 3, 7, 3.5);
  ctx.fillStyle = "rgba(15,10,25,0.8)";
  ctx.fill();
  if (ratio > 0) {
    roundRect(ctx, x, y, w * ratio, 4, 2);
    ctx.fillStyle =
      ratio > 0.6 ? "#4ade80" : ratio > 0.3 ? "#facc15" : "#f87171";
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

/** A spinning ring under a fighter that is being attacked, in the attackers' colour. */
export function drawFocusRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  time: number,
) {
  ctx.save();
  ctx.translate(x, y + r * 0.55);
  ctx.scale(1, 0.45);
  ctx.strokeStyle = "rgba(251,191,36,0.95)";
  ctx.shadowColor = "rgba(251,191,36,0.8)";
  ctx.shadowBlur = 12;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, r + 10 + Math.sin(time * 5) * 2.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawTargetRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  team: Team,
  count: number,
  time: number,
) {
  ctx.save();
  ctx.translate(x, y + r * 0.55);
  ctx.scale(1, 0.45);
  ctx.strokeStyle =
    team === "blue" ? "rgba(96,165,250,0.95)" : "rgba(248,113,113,0.95)";
  ctx.lineWidth = 2.5 + Math.min(count, 4);
  ctx.setLineDash([9, 6]);
  ctx.lineDashOffset = (team === "blue" ? -1 : 1) * time * 40;
  ctx.beginPath();
  ctx.arc(0, 0, r + 7 + (team === "red" ? 5 : 0), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  if (count > 1) {
    ctx.save();
    ctx.font = `700 12px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lx = x + (team === "blue" ? -r - 12 : r + 12);
    const ly = y + r * 0.6;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(15,10,25,0.85)";
    ctx.strokeText(`×${count}`, lx, ly);
    ctx.fillStyle = team === "blue" ? "#bfdbfe" : "#fecaca";
    ctx.fillText(`×${count}`, lx, ly);
    ctx.restore();
  }
}

export function barOffset(info: UnitInfo) {
  return info.type === "mage" ? 30 : info.type === "knight" ? 18 : 14;
}

/** A dashed circle showing how far a fighter can spot enemies. */
export function drawSightCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  team: Team,
  alpha: number,
  /** Written above the circle, if given. */
  label?: string,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle =
    team === "blue" ? "rgba(147,197,253,0.85)" : "rgba(252,165,165,0.85)";
  ctx.fillStyle =
    team === "blue" ? "rgba(147,197,253,0.06)" : "rgba(252,165,165,0.06)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  if (label) {
    const ly = y - r > WALL + 10 ? y - r - 2 : y + r + 14;
    ctx.font = `600 12px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(15,10,25,0.85)";
    ctx.strokeText(`👁 ${label}`, x, ly);
    ctx.fillStyle = "#e0f2fe";
    ctx.fillText(`👁 ${label}`, x, ly);
  }
  ctx.restore();
}

/** The red eye shown above a blue fighter that the enemy can see. */
export function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
) {
  const s = 1 + Math.sin(time * 8) * 0.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.quadraticCurveTo(0, -7, 8, 0);
  ctx.quadraticCurveTo(0, 7, -8, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawSlash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  facing: number,
  t: number,
) {
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

export function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
) {
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

export function drawTooltip(
  ctx: CanvasRenderingContext2D,
  u: UnitSnap,
  info: UnitInfo,
  text: RendererText,
  targetName?: string,
) {
  const doing = `${ACT_ICONS[u.act] ?? ""} ${text.acts[u.act] ?? u.act}${targetName ? ` ${targetName}` : ""}`;
  const lines = [
    `${text.unitTitle(info.name, info.type)}${u.hidden ? ` ${text.hidden}` : ""}`,
    `❤ ${Math.ceil(u.hp)} / ${info.maxHp}   👁 ${UNIT_STATS[info.type].sight}   ${u.seen && info.team === "blue" ? text.spotted : ""}`,
    doing,
  ];
  ctx.font = `600 12px ${FONT}`;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18;
  const h = 56;
  const x = Math.max(
    WALL,
    Math.min(ARENA_W - WALL - w, u.x + info.radius * VIS + 8),
  );
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
  ctx.fillStyle = "#fde68a";
  ctx.fillText(lines[2], x + 9, y + 44);
  ctx.fillStyle = "#fff";
  ctx.fillText(lines[0], x + 9, y + 13);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(lines[1], x + 9, y + 28);
}
