import { useEffect, useRef } from "react";
import { UNIT_STATS, type Team, type UnitType } from "@code-royale/engine";
import { drawUnit } from "@code-royale/renderer";

export function StarIcon({ on, size = 20, className }: { on: boolean; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="star-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef08a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.8l3.1 6.5 7.1.9-5.2 4.9 1.3 7.1L12 17.8l-6.3 3.4L7 14.1 1.8 9.2l7.1-.9z"
        fill={on ? "url(#star-gold)" : "rgba(255,255,255,0.08)"}
        stroke={on ? "#b45309" : "rgba(255,255,255,0.25)"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrownLogo({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="crown-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path d="M8 46 L4 16 L20 28 L32 8 L44 28 L60 16 L56 46 Z" fill="url(#crown-g)" stroke="#92400e" strokeWidth="3" strokeLinejoin="round" />
      <rect x="8" y="46" width="48" height="9" rx="2" fill="#f59e0b" stroke="#92400e" strokeWidth="3" />
      <circle cx="32" cy="34" r="5" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1.5" />
      <circle cx="17" cy="38" r="3.5" fill="#ef4444" />
      <circle cx="47" cy="38" r="3.5" fill="#ef4444" />
    </svg>
  );
}

/** A little live portrait of a fighter, drawn with the same code as the arena. */
export function UnitIcon({ type, team, size = 44 }: { type: UnitType; team: Team; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d")!;
    const r = Math.min(UNIT_STATS[type].radius, 30);
    const scale = (size * 0.3) / r;
    let raf = 0;
    const start = performance.now();
    const draw = (ts: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      drawUnit(ctx, {
        x: size / 2 / scale,
        y: (size * 0.6) / scale,
        r,
        type,
        team,
        facing: team === "blue" ? 0.2 : Math.PI - 0.2,
        time: (ts - start) / 1000,
        seed: type.length,
        moving: false,
        swing: -1,
        shot: -1,
        flash: 0,
        raging: false,
        shield: 0,
        spin: 0,
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [type, team, size]);
  return <canvas ref={ref} style={{ width: size, height: size, flex: "none" }} />;
}
