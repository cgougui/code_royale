/// <reference lib="webworker" />
// Replays a battle and traces a fighter's script for the debugger.
// A fresh worker per request: scripts can leave globals behind, and replays must start from a clean slate.
import { levelById, toBattleSetup } from "@code-royale/content";
import { debugBattle } from "@code-royale/engine";
import type { FromTraceWorker, TraceJob } from "./protocol";

self.onmessage = (ev: MessageEvent<TraceJob>) => {
  const { levelId, blueCode, seed, request } = ev.data;
  const reply: FromTraceWorker = debugBattle(toBattleSetup(levelById(levelId), blueCode, seed), request);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(reply);
};
