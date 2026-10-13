/** Procedural sprites: fighters, projectiles and items drawn with Canvas 2D (no image assets). */
import type { ItemKind, ProjectileKind, Team, UnitType } from "@code-royale/engine";

export const TEAM_COLORS: Record<Team, { base: string; light: string; dark: string; glow: string }> = {
  blue: { base: "#3b82f6", light: "#93c5fd", dark: "#1e3a8a", glow: "rgba(96,165,250,0.6)" },
  red: { base: "#ef4444", light: "#fca5a5", dark: "#7f1d1d", glow: "rgba(248,113,113,0.6)" },
};

type Ctx = CanvasRenderingContext2D;

export interface UnitPose {
  x: number;
  y: number;
  r: number;
  type: UnitType;
  team: Team;
  facing: number;
  time: number;
  seed: number;
  moving: boolean;
  /** 0..1 progress of a melee swing, or -1. */
  swing: number;
  /** 0..1 progress of a shot (bow pull), or -1. */
  shot: number;
  flash: number;
  raging: boolean;
  shield: number;
  spin: number;
}

function circle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

export function drawShadow(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.85, r * 0.95, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawUnit(ctx: Ctx, p: UnitPose) {
  const { r, team, type, time } = p;
  const c = TEAM_COLORS[team];
  const flip = Math.cos(p.facing) < -0.05 ? -1 : 1;
  const bob = p.moving ? Math.abs(Math.sin(time * 14 + p.seed)) * r * 0.18 : Math.sin(time * 2.5 + p.seed) * r * 0.04;
  const squash = p.moving ? 1 + Math.sin(time * 28 + p.seed) * 0.04 : 1;

  ctx.save();
  ctx.translate(p.x, p.y - bob);
  if (p.spin > 0) ctx.rotate(p.spin * Math.PI * 4);

  if (p.raging) {
    const g = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.8);
    g.addColorStop(0, "rgba(255,120,0,0.55)");
    g.addColorStop(1, "rgba(255,60,0,0)");
    ctx.fillStyle = g;
    circle(ctx, 0, 0, r * 1.8 + Math.sin(time * 20) * 2);
    ctx.fill();
  }

  // Weapon behind the body when facing away from the weapon hand.
  ctx.save();
  ctx.scale(flip, 1);
  drawBackGear(ctx, p, r, c);
  ctx.restore();

  // Body.
  ctx.save();
  ctx.scale(1 / squash, squash);
  const body = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
  const skin = bodyColors(type, team);
  body.addColorStop(0, skin.light);
  body.addColorStop(0.55, skin.base);
  body.addColorStop(1, skin.dark);
  ctx.fillStyle = body;
  circle(ctx, 0, 0, r);
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.strokeStyle = skin.outline;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.scale(flip, 1);
  drawHead(ctx, p, r, c);
  drawFace(ctx, p, r, flip);
  drawFrontGear(ctx, p, r, c);
  ctx.restore();

  if (p.flash > 0) {
    ctx.globalAlpha = p.flash * 0.8;
    ctx.fillStyle = "#fff";
    circle(ctx, 0, 0, r * 1.05);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (p.shield > 0) {
    ctx.strokeStyle = `rgba(125,211,252,${0.6 + Math.sin(time * 6) * 0.2})`;
    ctx.fillStyle = "rgba(125,211,252,0.15)";
    ctx.lineWidth = 2.5;
    circle(ctx, 0, 0, r * 1.45);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function bodyColors(type: UnitType, team: Team) {
  const c = TEAM_COLORS[team];
  if (type === "goblin") {
    return team === "red"
      ? { light: "#fda4af", base: "#e11d48", dark: "#881337", outline: "#4c0519" }
      : { light: "#a5f3fc", base: "#0891b2", dark: "#164e63", outline: "#082f49" };
  }
  if (type === "ogre") {
    return team === "red"
      ? { light: "#fca5a5", base: "#b91c1c", dark: "#5f1010", outline: "#3b0a0a" }
      : { light: "#bfdbfe", base: "#2563eb", dark: "#1e3a8a", outline: "#0f1d4a" };
  }
  return { light: c.light, base: c.base, dark: c.dark, outline: team === "red" ? "#450a0a" : "#172554" };
}

function drawFace(ctx: Ctx, p: UnitPose, r: number, flip: number) {
  const lookX = Math.cos(p.facing) * flip;
  const lookY = Math.sin(p.facing);
  const blink = (p.time * 0.9 + p.seed) % 4 < 0.08;
  const ey = p.type === "knight" ? r * 0.02 : -r * 0.08;
  const ex = r * 0.3;
  const er = p.type === "ogre" ? r * 0.15 : r * 0.24;
  for (const dx of [ex - r * 0.2, ex + r * 0.22]) {
    if (blink) {
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dx - er * 0.8, ey);
      ctx.lineTo(dx + er * 0.8, ey);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(dx, ey, er * 0.85, er, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    circle(ctx, dx + lookX * er * 0.35, ey + lookY * er * 0.35, er * 0.5);
    ctx.fill();
    ctx.fillStyle = "#fff";
    circle(ctx, dx + lookX * er * 0.35 - er * 0.18, ey + lookY * er * 0.35 - er * 0.2, er * 0.17);
    ctx.fill();
  }
  // Angry brows for goblins & ogres, or when raging.
  if (p.type === "goblin" || p.type === "ogre" || p.raging) {
    ctx.strokeStyle = "#111";
    ctx.lineWidth = Math.max(2, r * 0.1);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.42, ey - er * 1.25);
    ctx.lineTo(ex - r * 0.05, ey - er * 0.8);
    ctx.moveTo(ex + r * 0.42, ey - er * 1.25);
    ctx.lineTo(ex + r * 0.07, ey - er * 0.8);
    ctx.stroke();
  }
  // Mouth.
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.lineCap = "round";
  ctx.beginPath();
  if (p.type === "ogre") {
    ctx.moveTo(ex - r * 0.3, r * 0.4);
    ctx.lineTo(ex + r * 0.3, r * 0.4);
    ctx.stroke();
    ctx.fillStyle = "#fef3c7";
    for (const tx of [ex - r * 0.25, ex + r * 0.2]) {
      ctx.beginPath();
      ctx.moveTo(tx, r * 0.42);
      ctx.lineTo(tx + r * 0.06, r * 0.18);
      ctx.lineTo(tx + r * 0.12, r * 0.42);
      ctx.fill();
    }
  } else if (p.type === "goblin") {
    ctx.moveTo(ex - r * 0.22, r * 0.35);
    ctx.lineTo(ex + r * 0.25, r * 0.32);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.1, r * 0.34);
    ctx.lineTo(ex - r * 0.04, r * 0.48);
    ctx.lineTo(ex + r * 0.02, r * 0.34);
    ctx.fill();
  } else {
    ctx.arc(ex, r * 0.22, r * 0.18, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
}

function drawHead(ctx: Ctx, p: UnitPose, r: number, c: (typeof TEAM_COLORS)[Team]) {
  switch (p.type) {
    case "knight": {
      // Steel helmet with a team-coloured plume.
      ctx.fillStyle = c.base;
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, -r * 0.9);
      ctx.quadraticCurveTo(-r * 0.9, -r * 1.7, -r * 1.2, -r * 0.9);
      ctx.quadraticCurveTo(-r * 0.6, -r * 1.2, -r * 0.1, -r * 0.7);
      ctx.fill();
      const g = ctx.createLinearGradient(0, -r, 0, -r * 0.1);
      g.addColorStop(0, "#f1f5f9");
      g.addColorStop(1, "#94a3b8");
      ctx.fillStyle = g;
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = Math.max(1.5, r * 0.1);
      ctx.beginPath();
      ctx.arc(0, -r * 0.05, r * 1.0, Math.PI * 1.02, Math.PI * 1.98);
      ctx.lineTo(r * 0.98, -r * 0.25);
      ctx.lineTo(-r * 0.98, -r * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#64748b";
      ctx.beginPath();
      ctx.moveTo(-r * 0.05, -r * 1.0);
      ctx.lineTo(-r * 0.05, -r * 0.3);
      ctx.stroke();
      break;
    }
    case "archer": {
      // Feathered cap.
      ctx.fillStyle = "#166534";
      ctx.strokeStyle = "#052e16";
      ctx.lineWidth = Math.max(1.5, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(-r * 1.0, -r * 0.35);
      ctx.quadraticCurveTo(-r * 0.2, -r * 1.6, r * 1.15, -r * 0.55);
      ctx.quadraticCurveTo(r * 0.2, -r * 0.6, -r * 1.0, -r * 0.35);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.light;
      ctx.beginPath();
      ctx.ellipse(-r * 0.55, -r * 1.05, r * 0.18, r * 0.6, -0.9, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "scout": {
      // Team-coloured scarf flapping behind.
      const flap = Math.sin(p.time * 12 + p.seed) * r * 0.15;
      ctx.fillStyle = c.light;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, r * 0.35);
      ctx.quadraticCurveTo(-r * 1.4, r * 0.3 + flap, -r * 1.8, r * 0.55 + flap);
      ctx.lineTo(-r * 1.5, r * 0.75 + flap);
      ctx.quadraticCurveTo(-r * 1.1, r * 0.6, -r * 0.55, r * 0.6);
      ctx.fill();
      // Leather cap.
      ctx.fillStyle = "#92400e";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = Math.max(1.5, r * 0.1);
      ctx.beginPath();
      ctx.arc(0, -r * 0.05, r * 1.0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.quadraticCurveTo(0, -r * 0.5, -r * 0.95, -r * 0.4);
      ctx.fill();
      ctx.stroke();
      // Goggles pushed up on the forehead.
      for (const gx of [r * 0.05, r * 0.5]) {
        ctx.fillStyle = "#67e8f9";
        ctx.strokeStyle = "#1c1917";
        ctx.lineWidth = Math.max(1.5, r * 0.12);
        circle(ctx, gx, -r * 0.62, r * 0.2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        circle(ctx, gx - r * 0.06, -r * 0.68, r * 0.06);
        ctx.fill();
      }
      break;
    }
    case "mage": {
      ctx.fillStyle = "#6d28d9";
      ctx.strokeStyle = "#2e1065";
      ctx.lineWidth = Math.max(1.5, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(-r * 1.15, -r * 0.4);
      ctx.lineTo(r * 1.1, -r * 0.4);
      ctx.lineTo(r * 0.1, -r * 0.65);
      ctx.quadraticCurveTo(-r * 0.2, -r * 1.6, -r * 0.9, -r * 2.0);
      ctx.quadraticCurveTo(-r * 0.4, -r * 1.2, -r * 0.6, -r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawStar(ctx, -r * 0.25, -r * 0.95, r * 0.22, "#fde047");
      break;
    }
    case "goblin": {
      // Big pointy ears.
      const skin = bodyColors("goblin", p.team);
      ctx.fillStyle = skin.base;
      ctx.strokeStyle = skin.outline;
      ctx.lineWidth = Math.max(1.5, r * 0.12);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * r * 0.7, -r * 0.45);
        ctx.lineTo(s * r * 1.7, -r * 0.9);
        ctx.lineTo(s * r * 0.85, -r * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = "#1c1917";
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * 0.95, Math.PI * 1.15, Math.PI * 1.85);
      ctx.quadraticCurveTo(0, -r * 0.65, -r * 0.55, -r * 0.8);
      ctx.fill();
      break;
    }
    case "ogre": {
      // A little golden crown for the king.
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#a16207";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.82);
      ctx.lineTo(-r * 0.5, -r * 1.25);
      ctx.lineTo(-r * 0.22, -r * 1.02);
      ctx.lineTo(0, -r * 1.35);
      ctx.lineTo(r * 0.22, -r * 1.02);
      ctx.lineTo(r * 0.5, -r * 1.25);
      ctx.lineTo(r * 0.45, -r * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
  }
}

function drawBackGear(ctx: Ctx, p: UnitPose, r: number, c: (typeof TEAM_COLORS)[Team]) {
  if (p.type === "knight") {
    // Shield on the back hand.
    ctx.save();
    ctx.translate(-r * 0.85, r * 0.25);
    ctx.fillStyle = c.base;
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 0.5);
    ctx.lineTo(r * 0.45, -r * 0.5);
    ctx.lineTo(r * 0.45, r * 0.05);
    ctx.quadraticCurveTo(r * 0.4, r * 0.5, 0, r * 0.7);
    ctx.quadraticCurveTo(-r * 0.4, r * 0.5, -r * 0.45, r * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fde047";
    drawStar(ctx, 0, 0, r * 0.22, "#fde047");
    ctx.restore();
  }
}

function drawFrontGear(ctx: Ctx, p: UnitPose, r: number, c: (typeof TEAM_COLORS)[Team]) {
  const hx = r * 0.95;
  const hy = r * 0.25;
  switch (p.type) {
    case "knight":
    case "goblin": {
      const big = p.type === "knight";
      let a = -0.5;
      if (p.swing >= 0) a = p.swing < 0.35 ? -0.5 - (p.swing / 0.35) * 1.2 : -1.7 + ((p.swing - 0.35) / 0.65) * 3.2;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(a + Math.PI / 2);
      const len = big ? r * 1.6 : r * 1.1;
      const g = ctx.createLinearGradient(-3, 0, 3, 0);
      g.addColorStop(0, "#f8fafc");
      g.addColorStop(1, "#94a3b8");
      ctx.fillStyle = g;
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.12, 0);
      ctx.lineTo(-r * 0.12, -len);
      ctx.lineTo(0, -len - r * 0.25);
      ctx.lineTo(r * 0.12, -len);
      ctx.lineTo(r * 0.12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = big ? "#ca8a04" : "#57534e";
      ctx.fillRect(-r * 0.35, -r * 0.08, r * 0.7, r * 0.16);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(-r * 0.08, 0, r * 0.16, r * 0.35);
      ctx.restore();
      break;
    }
    case "archer": {
      const pull = p.shot >= 0 ? Math.sin(Math.min(1, p.shot) * Math.PI) : 0;
      ctx.save();
      ctx.translate(hx, hy - r * 0.1);
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = Math.max(2, r * 0.18);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(-r * 0.3, 0, r * 0.95, -1.1, 1.1);
      ctx.stroke();
      ctx.strokeStyle = "#f5f5f4";
      ctx.lineWidth = 1;
      const sx = -r * 0.3 + Math.cos(1.1) * r * 0.95;
      const sy = Math.sin(1.1) * r * 0.95;
      ctx.beginPath();
      ctx.moveTo(sx, -sy);
      ctx.lineTo(sx - pull * r * 0.6, 0);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "scout": {
      // A throwing knife, raised when throwing.
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(-0.6 + (p.shot >= 0 ? Math.sin(p.shot * Math.PI) * -1.4 : 0));
      ctx.fillStyle = "#e2e8f0";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, 0);
      ctx.lineTo(0, -r * 0.95);
      ctx.lineTo(r * 0.1, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#78350f";
      ctx.fillRect(-r * 0.09, 0, r * 0.18, r * 0.35);
      ctx.restore();
      break;
    }
    case "mage": {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(-0.15 + (p.shot >= 0 ? Math.sin(p.shot * Math.PI) * -0.5 : 0));
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = Math.max(2, r * 0.16);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, r * 0.7);
      ctx.lineTo(0, -r * 1.3);
      ctx.stroke();
      const orb = "#fb923c";
      const glow = ctx.createRadialGradient(0, -r * 1.45, 0, 0, -r * 1.45, r * 0.7);
      glow.addColorStop(0, orb);
      glow.addColorStop(1, "rgba(255,200,0,0)");
      ctx.fillStyle = glow;
      circle(ctx, 0, -r * 1.45, r * (0.6 + Math.sin(p.time * 5 + p.seed) * 0.08));
      ctx.fill();
      ctx.fillStyle = "#fff";
      circle(ctx, 0, -r * 1.45, r * 0.18);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "ogre": {
      let a = -0.3;
      if (p.swing >= 0) a = p.swing < 0.4 ? -0.3 - (p.swing / 0.4) * 1.3 : -1.6 + ((p.swing - 0.4) / 0.6) * 2.6;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = "#92400e";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, r * 0.2);
      ctx.lineTo(-r * 0.28, -r * 1.3);
      ctx.quadraticCurveTo(0, -r * 1.6, r * 0.28, -r * 1.3);
      ctx.lineTo(r * 0.1, r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#d6d3d1";
      for (const [sx, sy] of [
        [-0.3, -1.0],
        [0.3, -1.15],
        [-0.25, -1.4],
      ]) {
        ctx.beginPath();
        ctx.moveTo(sx * r, sy * r);
        ctx.lineTo(sx * r * 1.8, sy * r - 3);
        ctx.lineTo(sx * r, sy * r - 6);
        ctx.fill();
      }
      ctx.restore();
      void c;
      break;
    }
  }
}

export function drawStar(ctx: Ctx, x: number, y: number, r: number, color: string, points = 5) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawProjectile(ctx: Ctx, kind: ProjectileKind, team: Team, x: number, y: number, angle: number, time: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  switch (kind) {
    case "arrow": {
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(6, -4);
      ctx.lineTo(6, 4);
      ctx.fill();
      ctx.fillStyle = TEAM_COLORS[team].light;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-19, -4);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-19, 4);
      ctx.fill();
      break;
    }
    case "powershot": {
      const g = ctx.createLinearGradient(-60, 0, 20, 0);
      g.addColorStop(0, "rgba(253,224,71,0)");
      g.addColorStop(1, "rgba(253,224,71,0.9)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-60, -6);
      ctx.lineTo(20, -3);
      ctx.lineTo(20, 3);
      ctx.lineTo(-60, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(12, -8);
      ctx.lineTo(12, 8);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
      break;
    }
    case "knife": {
      ctx.rotate(time * 30);
      ctx.fillStyle = "#e2e8f0";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(0, -2.5);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "fireball": {
      const wob = Math.sin(time * 30) * 1.5;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 16 + wob);
      g.addColorStop(0, "#fffbeb");
      g.addColorStop(0.3, "#fbbf24");
      g.addColorStop(0.65, "#f97316");
      g.addColorStop(1, "rgba(239,68,68,0)");
      ctx.fillStyle = g;
      circle(ctx, 0, 0, 16 + wob);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

export function drawItem(ctx: Ctx, kind: ItemKind, x: number, y: number, time: number, seed: number) {
  const hover = Math.sin(time * 3 + seed) * 4;
  ctx.save();
  // Glow on the ground.
  const glowColor = kind === "potion" ? "236,72,153" : kind === "rage" ? "249,115,22" : "56,189,248";
  const g = ctx.createRadialGradient(x, y + 8, 0, x, y + 8, 26);
  g.addColorStop(0, `rgba(${glowColor},0.55)`);
  g.addColorStop(1, `rgba(${glowColor},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, y - 6 + hover);
  if (kind === "potion") {
    ctx.fillStyle = "#ec4899";
    ctx.strokeStyle = "#500724";
    ctx.lineWidth = 2;
    circle(ctx, 0, 3, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fbcfe8";
    ctx.fillRect(-3.5, -12, 7, 8);
    ctx.strokeRect(-3.5, -12, 7, 8);
    ctx.fillStyle = "#92400e";
    ctx.fillRect(-4.5, -15, 9, 4);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    circle(ctx, -3, 0, 2.5);
    ctx.fill();
  } else if (kind === "rage") {
    ctx.rotate(Math.sin(time * 2 + seed) * 0.2);
    ctx.fillStyle = "#f97316";
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(10, -3);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(5, -3);
    ctx.lineTo(0, 0);
    ctx.lineTo(-5, -3);
    ctx.fill();
  } else {
    const og = ctx.createRadialGradient(-3, -3, 1, 0, 0, 11);
    og.addColorStop(0, "#e0f2fe");
    og.addColorStop(0.5, "#38bdf8");
    og.addColorStop(1, "#0369a1");
    ctx.fillStyle = og;
    ctx.strokeStyle = "#0c4a6e";
    ctx.lineWidth = 2;
    circle(ctx, 0, 0, 10);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(0, 0, 14 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
