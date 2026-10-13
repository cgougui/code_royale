import type { TraceReply } from "@code-royale/engine";
import { appMessage, type AppMessage } from "../domain/messages";
import type { FromTraceWorker, TraceJob } from "./protocol";

/** The worker's reply, or why there is none (the app's own reasons included). */
export type TraceOutcome =
  | Exclude<TraceReply, { kind: "unavailable" }>
  | { kind: "unavailable"; reason: AppMessage };

/** Replaying a battle takes milliseconds; this long means the code is stuck in a loop before that moment. */
const STUCK_MS = 4000;

/** Asks a fresh worker to trace a fighter's script. Rejects with an AbortError if `signal` aborts first. */
export function requestTrace(
  job: TraceJob,
  signal?: AbortSignal,
): Promise<TraceOutcome> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const worker = new Worker(new URL("./trace.worker.ts", import.meta.url), {
      type: "module",
    });
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };
    const abort = () => {
      finish();
      reject(signal!.reason);
    };
    const timer = setTimeout(() => {
      finish();
      resolve({ kind: "unavailable", reason: appMessage("app.traceStuck") });
    }, STUCK_MS);
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = (ev: MessageEvent<FromTraceWorker>) => {
      finish();
      resolve(ev.data);
    };
    worker.onerror = (ev) => {
      ev.preventDefault();
      finish();
      resolve({
        kind: "unavailable",
        reason: appMessage("app.unexpected", { detail: ev.message }),
      });
    };
    try {
      worker.postMessage(job);
    } catch (error) {
      finish();
      reject(error);
    }
  });
}
