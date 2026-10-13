import type { TraceReply } from "@code-royale/engine";
import type { FromTraceWorker, TraceJob } from "./protocol";

/** Replaying a battle takes milliseconds; this long means the code is stuck in a loop before that moment. */
const STUCK_MS = 4000;

/** Asks a fresh worker to trace a fighter's script. Rejects with an AbortError if `signal` aborts first. */
export function requestTrace(
  job: TraceJob,
  signal?: AbortSignal,
): Promise<TraceReply> {
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
      resolve({
        kind: "unavailable",
        reason:
          "Your code got stuck before this moment: probably a loop that never ends. 🌀",
      });
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
        reason: `Something went wrong: ${ev.message}`,
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
