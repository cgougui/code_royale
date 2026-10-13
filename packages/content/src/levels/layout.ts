/** Helpers to place armies and write star goals. */
import { ARENA_W, type Circle, type SpawnSpec, type UnitType } from "@code-royale/engine";
import type { StarGoal } from "../types";

/** Places a column of units centred vertically around `cy`. */
export function column(type: UnitType, x: number, count: number, gap = 70, cy = 300): SpawnSpec[] {
  return Array.from({ length: count }, (_, i) => ({ type, x, y: cy + (i - (count - 1) / 2) * gap }));
}

/** The same army, placed on the red side of the arena (left-right mirror). */
export function mirror(specs: SpawnSpec[]): SpawnSpec[] {
  return specs.map((s) => ({ ...s, x: ARENA_W - s.x }));
}

export function center(c: Circle) {
  return { x: c.x, y: c.y };
}

/** A few fighters packed inside a bush. */
export function inBush(type: UnitType, b: Circle, count: number): SpawnSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    const r = count === 1 ? 0 : b.r * 0.45;
    return { type, x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r };
  });
}

export const win: StarGoal = { label: "Win the battle", test: (r) => r.winner === "blue" };
export const survivors = (n: number): StarGoal => ({ label: `Win with ${n}+ fighters alive`, test: (r) => r.winner === "blue" && r.blueAlive >= n });
export const flawless: StarGoal = { label: "Nobody on your team falls", test: (r) => r.winner === "blue" && r.blueAlive === r.blueTotal };
