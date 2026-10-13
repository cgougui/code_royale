import { BUSH_DETECT, UNIT_STATS } from "@code-royale/engine";
import { describe, expect, it } from "vitest";
import { setup, stepped, unit } from "./helpers";

const spotted = (blueX: number, red: { x: number; y: number; type?: "knight" | "scout" }, extra = {}) => {
  const b = stepped(setup({ blue: [unit(red.type ?? "knight", blueX, 300)], red: [unit("knight", red.x, red.y)], ...extra }), 1);
  return b.world.spotted.blue.size > 0;
};

describe("vision", () => {
  it("spots enemies inside the detection radius only", () => {
    const sight = UNIT_STATS.knight.sight;
    expect(spotted(300, { x: 300 + sight - 20, y: 300 })).toBe(true);
    expect(spotted(300, { x: 300 + sight + 40, y: 300 })).toBe(false);
  });

  it("hides fighters in bushes unless the viewer is very close", () => {
    const bushes = [{ x: 500, y: 300, r: 50 }];
    expect(spotted(500 - BUSH_DETECT - 40, { x: 500, y: 300 }, { bushes })).toBe(false);
    expect(spotted(500 - BUSH_DETECT + 30, { x: 500, y: 300 }, { bushes })).toBe(true);
  });

  it("lets scouts spot hidden fighters from further away", () => {
    const bushes = [{ x: 500, y: 300, r: 50 }];
    expect(spotted(500 - 150, { x: 500, y: 300, type: "scout" }, { bushes })).toBe(true);
  });

  it("does not see through rocks", () => {
    const rocks = [{ x: 400, y: 300, r: 30 }];
    expect(spotted(320, { x: 470, y: 300 }, { rocks })).toBe(false);
    expect(spotted(320, { x: 470, y: 300 })).toBe(true);
  });

  it("only gives scripts the enemies their team can see", () => {
    const b = stepped(setup({ blueCode: `if (me.nearestEnemy() === null) me.say("nobody")` }), 2);
    expect(b.world.units[0].say).toBe("nobody");
  });

  it("shares vision across the team", () => {
    const b = stepped(
      setup({
        blue: [unit("knight", 100, 300), unit("scout", 500, 300)],
        red: [unit("knight", 750, 300)],
        blueCode: `if (me.type == "knight" && enemies.length == 1) me.say("seen by scout")`,
      }),
      2,
    );
    expect(b.world.units[0].say).toBe("seen by scout");
  });
});
