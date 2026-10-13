/// <reference lib="webworker" />
// Runs a whole battle away from the page, so a player's infinite loop can never freeze the game.
import { ARENA_H, ARENA_W } from "./constants";
import { levelById } from "./levels";
import { runBattle } from "./sim";
import type { FromWorker, ToWorker } from "./types";

const post = (m: FromWorker) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

self.onmessage = (ev: MessageEvent<ToWorker>) => {
  const msg = ev.data;
  if (msg.type !== "run") return;
  const level = levelById(msg.levelId);
  const { result, compileError } = runBattle(
    { ...level, blueCode: msg.blueCode, seed: msg.seed },
    {
      onInit: (units) => post({ type: "init", units, arena: { width: ARENA_W, height: ARENA_H } }),
      onFrames: (frames, logs) => post({ type: "frames", frames, logs }),
    },
  );
  if (compileError) post({ type: "compileError", ...compileError });
  else post({ type: "done", result: result! });
};
