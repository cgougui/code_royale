import { ARENA_H, ARENA_W, WALL } from "../rules";

export type Point = { x: number; y: number };

export function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Keeps an x coordinate inside the arena walls for a circle of radius r. */
export function clampX(x: number, r: number) {
  return Math.max(WALL + r, Math.min(ARENA_W - WALL - r, x));
}

/** Keeps a y coordinate inside the arena walls for a circle of radius r. */
export function clampY(y: number, r: number) {
  return Math.max(WALL + r, Math.min(ARENA_H - WALL - r, y));
}

/** Distance from point p to the segment a→b. */
export function segDist(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
