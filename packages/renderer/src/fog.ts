import { ARENA_H, ARENA_W, type Circle } from "@code-royale/engine";

/** Reuses offscreen masks for sight circles and rock shadows. */
export class FogLayer {
  private fog: HTMLCanvasElement | null = null;
  private fogTmp: HTMLCanvasElement | null = null;

  /** Darkens everything the blue team can't see. Rocks cast "blind spots" behind them. */
  draw(
    ctx: CanvasRenderingContext2D,
    eyes: { x: number; y: number; sight: number }[],
    rocks: readonly Circle[],
  ) {
    const S = 0.5;
    const W = ARENA_W * S;
    const H = ARENA_H * S;
    if (!this.fog) {
      this.fog = document.createElement("canvas");
      this.fog.width = W;
      this.fog.height = H;
      this.fogTmp = document.createElement("canvas");
      this.fogTmp.width = W;
      this.fogTmp.height = H;
    }
    const fc = this.fog.getContext("2d")!;
    const tc = this.fogTmp!.getContext("2d")!;
    fc.globalCompositeOperation = "source-over";
    fc.clearRect(0, 0, W, H);
    fc.fillStyle = "rgba(10,8,26,0.64)";
    fc.fillRect(0, 0, W, H);
    for (const e of eyes) {
      tc.globalCompositeOperation = "source-over";
      tc.clearRect(0, 0, W, H);
      const g = tc.createRadialGradient(
        e.x * S,
        e.y * S,
        e.sight * S * 0.82,
        e.x * S,
        e.y * S,
        e.sight * S,
      );
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      tc.fillStyle = g;
      tc.beginPath();
      tc.arc(e.x * S, e.y * S, e.sight * S, 0, Math.PI * 2);
      tc.fill();
      tc.globalCompositeOperation = "destination-out";
      tc.fillStyle = "#000";
      for (const r of rocks) {
        const d = Math.hypot(r.x - e.x, r.y - e.y);
        if (d <= r.r || d > e.sight + r.r) continue;
        const a = Math.atan2(r.y - e.y, r.x - e.x);
        const h = Math.asin(r.r / d);
        const near = Math.sqrt(d * d - r.r * r.r);
        const far = e.sight + 60;
        tc.beginPath();
        tc.moveTo(
          (e.x + Math.cos(a - h) * near) * S,
          (e.y + Math.sin(a - h) * near) * S,
        );
        tc.lineTo(
          (e.x + Math.cos(a - h) * far) * S,
          (e.y + Math.sin(a - h) * far) * S,
        );
        tc.lineTo(
          (e.x + Math.cos(a) * far * 1.2) * S,
          (e.y + Math.sin(a) * far * 1.2) * S,
        );
        tc.lineTo(
          (e.x + Math.cos(a + h) * far) * S,
          (e.y + Math.sin(a + h) * far) * S,
        );
        tc.lineTo(
          (e.x + Math.cos(a + h) * near) * S,
          (e.y + Math.sin(a + h) * near) * S,
        );
        tc.closePath();
        tc.fill();
      }
      fc.globalCompositeOperation = "destination-out";
      fc.drawImage(this.fogTmp!, 0, 0);
    }
    ctx.drawImage(this.fog, 0, 0, ARENA_W, ARENA_H);
  }
}
