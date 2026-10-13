/** Helpers to place armies and write star goals. */
import { ARENA_W, type Circle, type SpawnSpec, type UnitType } from "@code-royale/engine";
import type { Goal } from "../types";

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

// Star goals (their labels are in the locales, their tests in goals.ts).
export const win: Goal = { kind: "win" };
export const survivors = (count: number): Goal => ({ kind: "survivors", count });
export const flawless: Goal = { kind: "flawless" };
export const battleCry: Goal = { kind: "battleCry" };
export const waves = (count: number): Goal => ({ kind: "waves", count });
