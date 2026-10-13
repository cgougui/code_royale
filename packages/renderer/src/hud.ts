import {
  ARENA_H,
  ARENA_W,
  type Frame,
  type Team,
  type UnitInfo,
} from "@code-royale/engine";
import { TEAM_COLORS } from "./sprites";
import { FONT, type HudInfo, type RendererText } from "./view";
import { fmtTime, roundRect } from "./canvas";

export function drawHud(
  ctx: CanvasRenderingContext2D,
  frame: Frame | null,
  infos: ReadonlyMap<number, UnitInfo>,
  hud: HudInfo,
  text: RendererText,
) {
  const totals = {
    blue: { hp: 0, max: 0, alive: 0 },
    red: { hp: 0, max: 0, alive: 0 },
  };
  // With waves, the red bar only measures the wave on the field right now.
  for (const info of infos.values())
    if (info.team === "blue" || hud.wave === undefined)
      totals[info.team].max += info.maxHp;
  if (frame) {
    for (const u of frame.units) {
      const info = infos.get(u.id);
      if (!info) continue;
      totals[info.team].hp += u.hp;
      totals[info.team].alive++;
      if (info.team === "red" && hud.wave !== undefined)
        totals.red.max += info.maxHp;
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
      roundRect(
        ctx,
        team === "blue" ? x + 2 : x + 2 + (barW - 4 - w),
        y + 2,
        w,
        14,
        7,
      );
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
    const label = text.teamBar(team, totals[team].alive);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.strokeText(label, team === "blue" ? x + 10 : x + barW - 10, y + 9.5);
    ctx.fillText(label, team === "blue" ? x + 10 : x + barW - 10, y + 9.5);
  }

  // Timer.
  const remaining = Math.max(0, hud.timeLimit - hud.time);
  const label =
    hud.wave !== undefined
      ? `${text.wave(hud.wave)} · ${fmtTime(hud.time)}`
      : fmtTime(remaining);
  ctx.font = `700 15px ${FONT}`;
  const tw = ctx.measureText(label).width + 28;
  roundRect(ctx, ARENA_W / 2 - tw / 2, 3, tw, 23, 11.5);
  ctx.fillStyle =
    hud.wave === undefined && remaining < 10
      ? "rgba(185,28,28,0.9)"
      : "rgba(15,10,25,0.8)";
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
    ctx.fillText(
      hud.speed < 1 ? text.slowMotion : text.speed(hud.speed),
      ARENA_W / 2,
      ARENA_H - 13,
    );
  }
}
