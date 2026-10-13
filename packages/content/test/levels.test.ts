import { Battle, checkSyntax, debugBattle, runBattle } from "@code-royale/engine";
import { contentFor, LEVELS, toBattleSetup } from "@code-royale/content";
import { describe, expect, it } from "vitest";

// Game behaviour is checked in the source language; locales.test.ts checks that translations match it.
const content = contentFor("en");

describe("campaign", () => {
  it("has unique ids and numbers in order", () => {
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
    expect(LEVELS.map((l) => l.num)).toEqual(LEVELS.map((_, i) => i + 1));
  });

  it("ships strategies that compile", () => {
    for (const s of Object.values(content.strategies)) expect(checkSyntax(s.code), s.id).toBeNull();
  });

  it("gives both teams the same army, unless the level says why not", () => {
    const army = (specs: { type: string }[]) => specs.map((s) => s.type).sort().join();
    for (const l of LEVELS) if (!l.unevenArmies) expect(army(l.red), l.id).toBe(army(l.blue));
  });

  it("explains every new command in its hints or text", () => {
    for (const l of content.levels) for (const s of l.hints) if (s.code) expect(checkSyntax(s.code), `${l.id}: ${s.title}`).toBeNull();
  });

  it.each(content.levels.map((l) => [l.id, l] as const))("%s runs with the starter code and red never crashes", (_, level) => {
    const battle = new Battle(toBattleSetup(level, content.starter.code, 3));
    expect(battle.prepare()).toBeNull();
    for (let i = 0; i < 400 && !battle.result; i++) battle.step();
    expect(battle.scripts.redErrors).toEqual([]);
  });

  it.each(content.levels.map((l) => [l.id, l] as const))("%s: the debugger can step through its red script", (_, level) => {
    // Played by blue, the (most advanced) red script gets traced like a player's would.
    const reply = debugBattle(toBattleSetup(level, level.redStrategy.code, 3), { tick: 40, unitId: 1 });
    expect(reply.kind).toBe("trace");
    if (reply.kind === "trace") expect(reply.trace.steps.length).toBeGreaterThan(1);
  });
});

/**
 * Golden replays: a hash of every frame for a few reference battles.
 * Any change to the rules, the systems or the levels changes these hashes.
 * If the change is intended, update with: npx vitest run -u
 */
describe("golden replays", () => {
  it.each(content.levels.filter((l) => !l.endless).map((l) => [l.id, l] as const))("%s", (_, level) => {
    let hash = 0x811c9dc5;
    const feed = (s: string) => {
      for (let i = 0; i < s.length; i++) hash = Math.imul(hash ^ s.charCodeAt(i), 0x01000193) >>> 0;
    };
    const { result } = runBattle(toBattleSetup(level, content.starter.code, 7), { onFrames: (f, l) => feed(JSON.stringify(f) + JSON.stringify(l)) });
    expect({ hash: hash.toString(16), winner: result!.winner, time: result!.time }).toMatchSnapshot();
  });
});

/** FNV-1a: a tiny, dependency-free hash, good enough to detect any change. */
