import {
  ARENA_H,
  ARENA_W,
  WALL,
  makeRng,
  type Circle,
  type Team,
} from "@code-royale/engine";
import { TEAM_COLORS } from "./sprites";

/** Owns the cached static ground and the terrain used by the fog layer. */
export class TerrainLayer {
  private key: string | null = null;
  private background: HTMLCanvasElement | null = null;
  rocks: Circle[] = [];

  set(key: string, bushes: Circle[], rocks: Circle[]): void {
    if (this.key === key) return;
    this.key = key;
    this.rocks = rocks;
    this.background = buildBackground(bushes, rocks);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.background ??= buildBackground([], []);
    ctx.drawImage(this.background, 0, 0, ARENA_W, ARENA_H);
  }
}

/** Paints the static arena once: grass, chalk lines, flowers and stone walls. */
function buildBackground(bushes: Circle[], rocks: Circle[]): HTMLCanvasElement {
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
    ctx.fillRect(
      rng() * ARENA_W,
      rng() * ARENA_H,
      2 + rng() * 3,
      2 + rng() * 3,
    );
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
        ctx.arc(
          x + Math.cos(a) * 2.5,
          y + Math.sin(a) * 2.5,
          2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const b of bushes) drawBush(ctx, b, rng);
  for (const r of rocks) drawRock(ctx, r, rng);

  // Inner shadow along the walls.
  const sh = 18;
  const edges: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ][] = [
    [WALL, WALL, ARENA_W - WALL * 2, sh, 0, WALL, 0, WALL + sh],
    [
      WALL,
      ARENA_H - WALL - sh,
      ARENA_W - WALL * 2,
      sh,
      0,
      ARENA_H - WALL,
      0,
      ARENA_H - WALL - sh,
    ],
    [WALL, WALL, sh, ARENA_H - WALL * 2, WALL, 0, WALL + sh, 0],
    [
      ARENA_W - WALL - sh,
      WALL,
      sh,
      ARENA_H - WALL * 2,
      ARENA_W - WALL,
      0,
      ARENA_W - WALL - sh,
      0,
    ],
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
  ctx.strokeRect(
    WALL - 1.5,
    WALL - 1.5,
    ARENA_W - WALL * 2 + 3,
    ARENA_H - WALL * 2 + 3,
  );

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

/** A leafy bush: a cluster of round leaves, darker underneath. */
function drawBush(ctx: CanvasRenderingContext2D, b: Circle, rng: () => number) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(b.x, b.y + b.r * 0.15, b.r * 1.02, b.r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  const blobs: [number, number, number][] = [];
  const n = Math.round(b.r / 6);
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * b.r * 0.62;
    blobs.push([
      b.x + Math.cos(a) * d,
      b.y + Math.sin(a) * d,
      b.r * (0.3 + rng() * 0.16),
    ]);
  }
  blobs.sort((p, q) => p[1] - q[1]);
  for (const [x, y, r] of blobs) {
    ctx.fillStyle = "#1f5a1c";
    ctx.beginPath();
    ctx.arc(x, y + 2, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [x, y, r] of blobs) {
    const g = ctx.createRadialGradient(
      x - r * 0.3,
      y - r * 0.4,
      r * 0.1,
      x,
      y,
      r,
    );
    g.addColorStop(0, "#5cb84a");
    g.addColorStop(1, "#2b7a27");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
    ctx.fill();
  }
  // A few leaf highlights.
  ctx.fillStyle = "rgba(190,242,100,0.5)";
  for (let i = 0; i < n * 2; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * b.r * 0.8;
    ctx.beginPath();
    ctx.ellipse(
      b.x + Math.cos(a) * d,
      b.y + Math.sin(a) * d,
      3,
      1.6,
      rng() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/** A grey boulder with a highlight and a few cracks. */
function drawRock(ctx: CanvasRenderingContext2D, r: Circle, rng: () => number) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(
    r.x + 4,
    r.y + r.r * 0.35,
    r.r * 1.05,
    r.r * 0.75,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  const pts: [number, number][] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const d = r.r * (0.9 + rng() * 0.14);
    pts.push([r.x + Math.cos(a) * d, r.y + Math.sin(a) * d]);
  }
  const g = ctx.createRadialGradient(
    r.x - r.r * 0.35,
    r.y - r.r * 0.45,
    r.r * 0.1,
    r.x,
    r.y,
    r.r * 1.1,
  );
  g.addColorStop(0, "#d6d3d1");
  g.addColorStop(0.6, "#8a8480");
  g.addColorStop(1, "#57534e");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#3a3633";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(58,54,51,0.6)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 2; i++) {
    const a = rng() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(r.x + Math.cos(a) * r.r * 0.2, r.y + Math.sin(a) * r.r * 0.2);
    ctx.lineTo(
      r.x + Math.cos(a + 0.3) * r.r * 0.6,
      r.y + Math.sin(a + 0.3) * r.r * 0.6,
    );
    ctx.stroke();
  }
}
