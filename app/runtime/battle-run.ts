import type {
  BattleResult,
  Frame,
  LogEntry,
  UnitInfo,
} from "@code-royale/engine";
import type { Locale } from "@code-royale/content";
import type { FromWorker, ToWorker } from "./protocol";
import type { BattleReplay } from "../domain/battle-replay";
import { appMessage, type AppMessage } from "../domain/messages";

export interface RunError {
  kind: "compile" | "loop" | "crash" | "runtime";
  message: AppMessage;
  line?: number;
  col?: number;
  /** The fighter whose code crashed (runtime errors). */
  unit?: string;
}

export interface RunHandlers {
  onInit?: () => void;
  onLogs?: (logs: LogEntry[]) => void;
  onDone?: (result: BattleResult) => void;
  onError?: (err: RunError) => void;
}

const STUCK_MS = 2000;

/** Runs a battle in a Web Worker and collects its frames for playback. */
export class BattleRun implements BattleReplay {
  frames: Frame[] = [];
  infos = new Map<number, UnitInfo>();
  result: BattleResult | null = null;
  error: RunError | null = null;
  /** Index of the frame holding the final, battle-ending death (for slow-mo). */
  finalTick = -1;
  private worker: Worker | null;
  private lastMessage = performance.now();
  private watchdog: ReturnType<typeof setInterval>;
  private stopped = false;

  constructor(
    readonly levelId: string,
    readonly locale: Locale,
    /** The code this battle was fought with (the debugger replays it). */
    readonly code: string,
    readonly seed: number,
    private handlers: RunHandlers,
  ) {
    this.worker = new Worker(new URL("./battle.worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = (ev: MessageEvent<FromWorker>) =>
      this.receive(ev.data);
    this.worker.onerror = (ev) => {
      ev.preventDefault();
      this.fail({
        kind: "crash",
        message: appMessage("app.unexpected", { detail: ev.message }),
      });
    };
    this.worker.postMessage({
      type: "run",
      levelId,
      locale,
      blueCode: code,
      seed,
    } satisfies ToWorker);
    this.watchdog = setInterval(() => {
      if (performance.now() - this.lastMessage > STUCK_MS) {
        this.fail({
          kind: "loop",
          message: appMessage("app.codeStuck"),
        });
      }
    }, 250);
  }

  get done() {
    return this.result !== null;
  }

  private receive(m: FromWorker) {
    if (this.stopped) return;
    this.lastMessage = performance.now();
    switch (m.type) {
      case "init":
        for (const u of m.units) this.infos.set(u.id, u);
        this.handlers.onInit?.();
        break;
      case "frames":
        for (const f of m.frames) {
          for (const e of f.events)
            if (e.k === "spawn") this.infos.set(e.unit.id, e.unit);
          this.frames.push(f);
        }
        if (m.logs.length) this.handlers.onLogs?.(m.logs);
        break;
      case "compileError":
        this.fail({
          kind: "compile",
          message: m.message,
          line: m.line,
          col: m.col,
        });
        break;
      case "done":
        this.result = m.result;
        if (m.result.winner !== "draw") {
          for (let i = this.frames.length - 1; i >= 0; i--) {
            if (this.frames[i].events.some((e) => e.k === "death")) {
              this.finalTick = i;
              break;
            }
          }
        }
        this.stop();
        this.handlers.onDone?.(m.result);
        break;
    }
  }

  private fail(err: RunError) {
    if (this.error || this.stopped) return;
    this.error = err;
    this.stop();
    this.handlers.onError?.(err);
  }

  stop() {
    this.stopped = true;
    clearInterval(this.watchdog);
    this.worker?.terminate();
    this.worker = null;
  }
}
