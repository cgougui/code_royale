import { Battle } from "./battle";
import type { BattleResult, BattleSetup, CompileError, Frame, LogEntry, UnitInfo } from "./protocol";

export interface RunHooks {
  /** Called once, before the first tick, with every fighter of the starting armies. */
  onInit?: (infos: UnitInfo[]) => void;
  /** Called with batches of frames (and the player messages produced meanwhile). */
  onFrames?: (frames: Frame[], logs: LogEntry[]) => void;
  /** Frames per batch (default 40 = 2 seconds of battle). */
  chunk?: number;
}

/** Runs a whole battle as fast as possible. Used by the web worker, tests and tools. */
export function runBattle(setup: BattleSetup, hooks: RunHooks = {}): { result?: BattleResult; compileError?: CompileError } {
  const battle = new Battle(setup);
  const err = battle.prepare();
  if (err) return { compileError: err };
  hooks.onInit?.(battle.unitInfos());
  const size = hooks.chunk ?? 40;
  let chunk: Frame[] = [];
  while (!battle.result) {
    chunk.push(battle.step());
    if (chunk.length >= size || battle.result) {
      hooks.onFrames?.(chunk, battle.drainLogs());
      chunk = [];
    }
  }
  return { result: battle.result! };
}
