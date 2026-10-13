import { describe, expect, it } from "vitest";
import { setup, stepped, unit } from "./helpers";

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe("orders", () => {
  it("moveTo walks to a spot", () => {
    const b = stepped(setup({ blueCode: "me.moveTo(400, 300)" }), 100);
    expect(dist(b.world.units[0], { x: 400, y: 300 })).toBeLessThan(2);
  });

  it("explore heads into unseen parts of the arena", () => {
    const b = stepped(setup({ blueCode: "me.explore()" }), 60);
    expect(dist(b.world.units[0], { x: 150, y: 300 })).toBeGreaterThan(50);
  });

  it("escape runs away from visible enemies", () => {
    const b = stepped(setup({ blue: [unit("archer", 400, 300)], red: [unit("knight", 520, 300)], blueCode: "me.escape()" }), 20);
    expect(b.world.units[0].x).toBeLessThan(400);
  });

  it("circle keeps the requested distance", () => {
    const b = stepped(setup({ blue: [unit("scout", 400, 300)], blueCode: "me.circle(480, 300, 120)" }), 120);
    expect(Math.abs(dist(b.world.units[0], { x: 480, y: 300 }) - 120)).toBeLessThan(10);
  });

  it("hide goes into the nearest bush and becomes hidden", () => {
    const b = stepped(setup({ bushes: [{ x: 300, y: 300, r: 50 }], blueCode: "me.hide()" }), 80);
    expect(b.world.isHidden(b.world.units[0])).toBe(true);
  });

  it("walks around rocks instead of getting stuck", () => {
    const b = stepped(setup({ rocks: [{ x: 300, y: 300, r: 40 }], blueCode: "me.moveTo(450, 300)" }), 140);
    expect(dist(b.world.units[0], { x: 450, y: 300 })).toBeLessThan(5);
  });

  it("melee fighters trade blows until one falls", () => {
    const code = "let e = me.nearestEnemy(); if (e) me.attack(e)";
    const b = stepped(setup({ blue: [unit("knight", 400, 300)], red: [unit("knight", 480, 300)], blueCode: code, redCode: code }), 600);
    expect(b.result).not.toBeNull();
  });
});
