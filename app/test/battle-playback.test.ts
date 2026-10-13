import { describe, expect, it } from "vitest";
import type { BattleResult, Frame } from "@code-royale/engine";
import { BattlePlayback } from "../domain/battle-playback";
import type { BattleReplay } from "../domain/battle-replay";

const result: BattleResult = {
  winner: "blue",
  time: 10,
  blueAlive: 1,
  blueTotal: 1,
  redAlive: 0,
  redTotal: 1,
  redKilled: 1,
  damageDealt: 100,
  wave: 1,
  said: false,
};
function replay(count = 50, done = true): BattleReplay & { frames: Frame[] } {
  return {
    levelId: "training",
    locale: "en",
    code: "",
    seed: 7,
    infos: new Map(),
    finalTick: -1,
    result: done ? result : null,
    done,
    frames: Array.from({ length: count }, (_, tick) => ({
      tick,
      units: [],
      projectiles: [],
      items: [],
      events: [],
    })),
  };
}

describe("battle playback", () => {
  it("holds for the countdown and pause, then interpolates at the chosen speed", () => {
    const clock = new BattlePlayback();
    const run = replay();
    expect(clock.advance(null, 0.05, 0, 1, false).frame).toBeNull();
    clock.reset(true);
    expect(clock.advance(run, 0.05, 50, 2, false).frame).toBe(0);
    clock.play();
    expect(clock.advance(run, 0.025, 100, 1, false).alpha).toBe(0.5);
    expect(clock.advance(run, 0.05, 150, 4, true).alpha).toBe(0.5);
    const update = clock.advance(run, 0.05, 300, 2, false);
    expect(update.frame).toBe(2);
    expect(update.alpha).toBe(0.5);
    expect(update.reportTick).toBe(2);
  });

  it("dispatches each event once, keeping important sounds at high speed", () => {
    const run = replay();
    run.frames[1].events = [
      { k: "wave", n: 2 },
      { k: "death", id: 1, x: 1, y: 1, team: "red" },
    ];
    const clock = new BattlePlayback();
    clock.reset(true);
    clock.play();
    const update = clock.advance(run, 0.05, 200, 4, false);
    expect(update.wave).toBe(2);
    expect(update.effects).toEqual([
      { kind: "event", event: run.frames[1].events[0], sound: false },
      { kind: "event", event: run.frames[1].events[1], sound: true },
    ]);
    expect(clock.advance(run, 0.05, 250, 4, false).effects).toEqual([]);
  });

  it("waits for streamed frames without finishing prematurely or losing events", () => {
    const run = replay(1, false);
    const clock = new BattlePlayback();
    clock.reset(true);
    clock.play();
    const stalled = clock.advance(run, 0.05, 200, 4, false);
    expect(stalled.frame).toBe(0);
    expect(stalled.finished).toBeUndefined();
    run.frames.push({
      tick: 1,
      units: [],
      projectiles: [],
      items: [],
      events: [{ k: "wave", n: 2 }],
    });
    const resumed = clock.advance(run, 0.05, 250, 4, false);
    expect(resumed.frame).toBe(1);
    expect(resumed.wave).toBe(2);
    expect(resumed.effects).toHaveLength(1);
  });

  it("reconstructs persistent events when seeking backwards, quietly", () => {
    const run = replay();
    run.frames[3].events = [{ k: "death", id: 1, x: 1, y: 1, team: "red" }];
    run.frames[4].events = [{ k: "wave", n: 2 }];
    const clock = new BattlePlayback();
    clock.reset(true);
    expect(clock.seek(run, 10)).toEqual([
      { kind: "event", event: run.frames[3].events[0], sound: false },
    ]);
    expect(clock.seek(run, 2)).toEqual([{ kind: "reset" }]);
    expect(clock.advance(run, 0.05, 200, 1, true).wave).toBe(1);
    expect(clock.seek(run, 5)).toEqual([
      { kind: "event", event: run.frames[3].events[0], sound: false },
    ]);
  });

  it("slows down the final blow and reports completion once after the finale", () => {
    const run = { ...replay(25), finalTick: 20 };
    const clock = new BattlePlayback();
    clock.reset(true);
    clock.seek(run, 19);
    expect(clock.advance(run, 0.05, 100, 4, false).speed).toBe(0.25);
    clock.seek(run, 24);
    const ending = clock.advance(run, 0.05, 200, 4, false);
    expect(ending.effects).toContainEqual({ kind: "confetti", team: "blue" });
    expect(ending.finished).toBeUndefined();
    expect(clock.advance(run, 0.05, 1800, 4, false).finished).toBeUndefined();
    expect(clock.advance(run, 0.05, 1801, 4, false).finished).toEqual(result);
    expect(clock.advance(run, 0.05, 1850, 4, false).finished).toBeUndefined();
    clock.reset(true);
    clock.play();
    expect(clock.advance(run, 0.05, 1900, 1, false).frame).toBe(1);
  });

  it("skips only completed runs and never rewinds an already advanced cursor", () => {
    const run = replay(50);
    const clock = new BattlePlayback();
    clock.reset(true);
    expect(clock.skip(run)).toEqual([]);
    clock.play();
    clock.skip(run);
    expect(clock.advance(run, 0, 0, 1, true).frame).toBe(29);
    clock.seek(run, 40);
    clock.skip(run);
    expect(clock.advance(run, 0, 0, 1, true).frame).toBe(40);
  });
});
