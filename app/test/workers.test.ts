import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BattleResult, Frame } from "@code-royale/engine";
import { BattleRun } from "../runtime/battle-run";
import { requestTrace } from "../runtime/trace-client";
import type { TraceJob } from "../runtime/protocol";

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror:
    ((event: { message: string; preventDefault(): void }) => void) | null =
    null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.instances.push(this);
  }
  emit(data: unknown) {
    this.onmessage?.({ data });
  }
}

const result: BattleResult = {
  winner: "blue",
  time: 2,
  blueAlive: 1,
  blueTotal: 1,
  redAlive: 0,
  redTotal: 1,
  redKilled: 1,
  damageDealt: 100,
  wave: 1,
  said: false,
};
const job: TraceJob = {
  levelId: "training",
  locale: "fr",
  blueCode: "",
  seed: 7,
  request: { tick: 1, unitId: 1 },
};
const frame: Frame = {
  tick: 1,
  units: [],
  projectiles: [],
  items: [],
  events: [{ k: "death", id: 1, x: 10, y: 10, team: "red" }],
};

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "performance",
    ],
  });
  FakeWorker.instances = [];
  vi.stubGlobal("Worker", FakeWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("battle worker lifecycle", () => {
  it("buffers frames, identifies the finale and terminates after completion", () => {
    const onDone = vi.fn();
    const run = new BattleRun("training", "fr", "me.explore()", 7, { onDone });
    const worker = FakeWorker.instances[0];
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: "run",
      levelId: "training",
      locale: "fr",
      blueCode: "me.explore()",
      seed: 7,
    });
    worker.emit({ type: "frames", frames: [frame], logs: [] });
    worker.emit({ type: "done", result });
    expect(run.frames).toEqual([frame]);
    expect(run.finalTick).toBe(0);
    expect(run.done).toBe(true);
    expect(onDone).toHaveBeenCalledOnce();
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("times out stuck code exactly once and cleans up the watchdog", () => {
    const onError = vi.fn();
    const run = new BattleRun("training", "fr", "while (true) {}", 7, { onError });
    vi.advanceTimersByTime(2500);
    expect(run.error?.kind).toBe("loop");
    expect(onError).toHaveBeenCalledOnce();
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores queued messages and errors after explicit cancellation", () => {
    const onInit = vi.fn(),
      onError = vi.fn();
    const run = new BattleRun("training", "fr", "", 7, { onInit, onError });
    const worker = FakeWorker.instances[0];
    run.stop();
    run.stop();
    worker.emit({ type: "init", units: [] });
    worker.emit({ type: "frames", frames: [frame], logs: [] });
    worker.onerror?.({ message: "late", preventDefault() {} });
    vi.advanceTimersByTime(5000);
    expect(run.frames).toEqual([]);
    expect(onInit).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("refreshes the watchdog when the worker is still sending frames", () => {
    const run = new BattleRun("training", "fr", "", 7, {});
    vi.advanceTimersByTime(1750);
    FakeWorker.instances[0].emit({ type: "frames", frames: [frame], logs: [] });
    vi.advanceTimersByTime(1750);
    expect(run.error).toBeNull();
    run.stop();
  });
});

describe("trace worker lifecycle", () => {
  it("terminates on success and removes pending timers", async () => {
    const pending = requestTrace(job);
    const reply = { kind: "unavailable", reason: { code: "debug.pickBlueFighter", params: {} } };
    FakeWorker.instances[0].emit(reply);
    await expect(pending).resolves.toEqual(reply);
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects on abort, terminating the worker before a stale reply", async () => {
    const controller = new AbortController();
    const pending = requestTrace(job, controller.signal);
    const rejection = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    controller.abort();
    FakeWorker.instances[0].emit({ kind: "unavailable", reason: { code: "debug.battleOver", params: {} } });
    await rejection;
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("never creates a worker for a request already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(requestTrace(job, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it("stops traces that get stuck before the requested tick", async () => {
    const pending = requestTrace(job);
    vi.advanceTimersByTime(4000);
    await expect(pending).resolves.toMatchObject({ kind: "unavailable" });
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
