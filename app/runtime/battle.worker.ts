/// <reference lib="webworker" />
// Runs a whole battle away from the page, so a player's infinite loop can never freeze the game.
// This is the only place where content (levels) and the engine meet at runtime.
import { levelById, toBattleSetup } from "@code-royale/content";
import { ARENA_H, ARENA_W, runBattle } from "@code-royale/engine";
import type { FromWorker, ToWorker } from "./protocol";

const post = (m: FromWorker) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

self.onmessage = (ev: MessageEvent<ToWorker>) => {
  const msg = ev.data;
  if (msg.type !== "run") return;
  const setup = toBattleSetup(levelById(msg.levelId), msg.blueCode, msg.seed);
  const { result, compileError } = runBattle(setup, {
    onInit: (units) => post({ type: "init", units, arena: { width: ARENA_W, height: ARENA_H } }),
    onFrames: (frames, logs) => post({ type: "frames", frames, logs }),
  });
  if (compileError) post({ type: "compileError", ...compileError });
  else post({ type: "done", result: result! });
};
