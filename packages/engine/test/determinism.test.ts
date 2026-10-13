import { describe, expect, it } from "vitest";
import { frames, setup, unit } from "./helpers";

const code = `let e = me.nearestEnemy(); if (e) me.attack(e); else me.explore()`;
const battle = (seed: number) =>
  setup({
    blue: [unit("knight", 150, 250), unit("archer", 120, 350)],
    red: [unit("knight", 810, 250), unit("mage", 840, 350)],
    blueCode: code,
    redCode: code,
    seed,
  });

describe("determinism", () => {
  it("replays exactly with the same seed", () => {
    expect(JSON.stringify(frames(battle(42)))).toBe(JSON.stringify(frames(battle(42))));
  });

  it("differs with another seed", () => {
    expect(JSON.stringify(frames(battle(42)))).not.toBe(JSON.stringify(frames(battle(43))));
  });

  it("is not affected by scripts using random()", () => {
    const calm = frames(battle(5)).length;
    const noisy = frames({ ...battle(5), blueCode: `random(); random(); ${code}` }).length;
    expect(noisy).toBe(calm);
  });
});
