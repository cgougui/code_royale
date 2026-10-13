import { checkSyntax, runBattle, type Message } from "@code-royale/engine";
import { describe, expect, it } from "vitest";
import { setup, stepped, unit } from "./helpers";

describe("script sandbox", () => {
  it("reports syntax errors with a line number", () => {
    const err = checkSyntax("let a = 1\nlet b = (2\nme.stop()");
    expect(err?.line).toBeGreaterThan(1);
  });

  it("says when something was opened but never closed", () => {
    expect(checkSyntax("if (true) {\n  me.stop()\n")?.message).toEqual({ code: "syntax.unclosed", params: {} });
  });

  it("gives friendly, language-neutral codes for common mistakes", () => {
    expect(checkSyntax("let a = 1\nlet a = 2")?.message).toEqual({ code: "syntax.alreadyDeclared", params: { name: "a" } });
    expect(checkSyntax('me.say("hi)')?.message.code).toBe("syntax.unterminatedString");
  });

  it("refuses to start a battle with broken blue code", () => {
    expect(runBattle(setup({ blueCode: "me.attack(" })).compileError).toBeDefined();
  });

  it("reports runtime errors once, with the line, and keeps the battle going", () => {
    const logs: Message[] = [];
    let line: number | undefined;
    runBattle(setup({ blueCode: "\n\nme.nearestEnmy()", timeLimit: 2 }), {
      onFrames: (_, l) => l.forEach((e) => (e.kind === "error" ? (logs.push(e.message), (line = e.line)) : null)),
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toEqual({ code: "runtime.notAFunction", params: { name: "me.nearestEnmy" } });
    expect(line).toBe(3);
  });

  it("nudges the player when fighters stand around blind", () => {
    const warns: string[] = [];
    runBattle(setup({ blueCode: "me.attack(me.nearestEnemy())", timeLimit: 5 }), {
      onFrames: (_, l) => l.forEach((e) => e.kind === "warn" && warns.push(e.message.code)),
    });
    expect(warns).toContain("warn.blind");
  });

  it("ignores attacks on teammates, with a friendly warning", () => {
    const b = stepped(setup({ blue: [unit("knight", 150, 300), unit("knight", 150, 360)], blueCode: "me.attack(me.nearestAlly())" }), 1);
    expect(b.world.units[0].intent.k).toBe("idle");
    expect(b.drainLogs().some((l) => l.kind === "warn" && l.message.code === "warn.friendlyFire")).toBe(true);
  });
});
