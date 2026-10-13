// Messages exchanged between the page and the workers.
import type { Locale } from "@code-royale/content";
import type { BattleResult, CompileError, Frame, LogEntry, TraceReply, TraceRequest, UnitInfo } from "@code-royale/engine";

/** `locale` picks the red script's language (its comments and speech bubbles); the battle is the same in all of them. */
export type ToWorker = { type: "run"; levelId: string; locale: Locale; blueCode: string; seed: number };
export type FromWorker =
  | ({ type: "compileError" } & CompileError)
  | { type: "init"; units: UnitInfo[]; arena: { width: number; height: number } }
  | { type: "frames"; frames: Frame[]; logs: LogEntry[] }
  | { type: "done"; result: BattleResult };

/** The debugger worker replays a battle (same level, code and seed) and traces one fighter's script. */
export interface TraceJob {
  levelId: string;
  locale: Locale;
  blueCode: string;
  seed: number;
  request: TraceRequest;
}
export type FromTraceWorker = TraceReply;
