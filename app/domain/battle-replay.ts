import type { BattleResult, Frame, UnitInfo } from "@code-royale/engine";

/** Read-only replay data shared by playback, debugging and UI; no worker dependency. */
export interface BattleReplay {
  readonly levelId: string;
  readonly code: string;
  readonly seed: number;
  readonly frames: readonly Frame[];
  readonly infos: ReadonlyMap<number, UnitInfo>;
  readonly result: BattleResult | null;
  readonly finalTick: number;
  readonly done: boolean;
}

/** Last tick whose scripts ran in this battle. */
export function lastTick(run: BattleReplay): number {
  return Math.max(0, run.frames.length - 1);
}

/** The frame showing the world as the scripts of `tick` see it (frame i is the world after tick i). */
export function frameIndex(run: BattleReplay, tick: number): number {
  return Math.max(0, Math.min(run.frames.length - 1, tick - 1));
}

/** Blue fighters standing when the scripts of `tick` run. */
export function blueFightersAt(run: BattleReplay, tick: number): number[] {
  const f = run.frames[frameIndex(run, tick)];
  return f
    ? f.units
        .filter((u) => run.infos.get(u.id)?.team === "blue")
        .map((u) => u.id)
    : [];
}
