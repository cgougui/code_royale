/** Wave generation for the endless survival mode. */
import type { SpawnSpec, UnitType } from "../protocol";
import { ARENA_H, ARENA_W } from "../rules";

/** The red army of endless wave `n` (n ≥ 2). Grows slowly; an ogre every 7 waves. */
export function endlessWave(n: number, rng: () => number): SpawnSpec[] {
  const specs: SpawnSpec[] = [];
  const add = (type: UnitType, count: number) => {
    for (let i = 0; i < count; i++) specs.push({ type, x: ARENA_W - 90 - rng() * 120, y: 90 + rng() * (ARENA_H - 180) });
  };
  add("goblin", 1 + Math.ceil(n * 0.5));
  add("knight", Math.floor((n - 1) / 3));
  add("archer", Math.floor((n - 1) / 4));
  add("scout", Math.floor(n / 7));
  add("mage", Math.floor(n / 9));
  if (n % 7 === 0) add("ogre", n / 7);
  return specs;
}
