// Messages exchanged between the page and the workers.
import type { BattleResult, Frame, LogEntry, TraceReply, TraceRequest, UnitInfo } from "@code-royale/engine";

export type ToWorker = { type: "run"; levelId: string; blueCode: string; seed: number };
export type FromWorker =
  | { type: "compileError"; message: string; line?: number; col?: number }
  | { type: "init"; units: UnitInfo[]; arena: { width: number; height: number } }
  | { type: "frames"; frames: Frame[]; logs: LogEntry[] }
  | { type: "done"; result: BattleResult };

/** The debugger worker replays a battle (same level, code and seed) and traces one fighter's script. */
export interface TraceJob {
  levelId: string;
  blueCode: string;
  seed: number;
  request: TraceRequest;
}
export type FromTraceWorker = TraceReply;
