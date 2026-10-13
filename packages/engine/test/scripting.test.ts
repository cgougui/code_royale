import { checkSyntax, runBattle } from "@code-royale/engine";
import { describe, expect, it } from "vitest";
import { setup, stepped, unit } from "./helpers";

describe("script sandbox", () => {
  it("reports syntax errors with a line number", () => {
    const err = checkSyntax("let a = 1\nlet b = (2\nme.stop()");
    expect(err?.line).toBeGreaterThan(1);
  });

  it("says when something was opened but never closed", () => {
    expect(checkSyntax("if (true) {\n  me.stop()\n")?.message).toMatch(/never closed/);
  });

  it("refuses to start a battle with broken blue code", () => {
    expect(runBattle(setup({ blueCode: "me.attack(" })).compileError).toBeDefined();
  });

  it("reports runtime errors once, with the line, and keeps the battle going", () => {
    const logs: string[] = [];
    let line: number | undefined;
    runBattle(setup({ blueCode: "\n\nme.nearestEnmy()", timeLimit: 2 }), {
      onFrames: (_, l) => l.forEach((e) => (e.kind === "error" ? (logs.push(e.text), (line = e.line)) : null)),
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatch(/nearestEnmy/);
    expect(line).toBe(3);
  });

  it("nudges the player when fighters stand around blind", () => {
    const warns: string[] = [];
    runBattle(setup({ blueCode: "me.attack(me.nearestEnemy())", timeLimit: 5 }), {
      onFrames: (_, l) => l.forEach((e) => e.kind === "warn" && warns.push(e.text)),
    });
    expect(warns.join()).toMatch(/explore/);
  });

  it("ignores attacks on teammates, with a friendly warning", () => {
    const b = stepped(setup({ blue: [unit("knight", 150, 300), unit("knight", 150, 360)], blueCode: "me.attack(me.nearestAlly())" }), 1);
    expect(b.world.units[0].intent.k).toBe("idle");
    expect(b.drainLogs().some((l) => /YOUR team/.test(l.text))).toBe(true);
  });
});
