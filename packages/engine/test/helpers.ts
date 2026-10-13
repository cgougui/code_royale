import { Battle, runBattle, type BattleSetup, type Frame, type SpawnSpec } from "@code-royale/engine";

/** A small battle: one blue and one red knight far apart, both idle by default. */
export function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    blue: [{ type: "knight", x: 150, y: 300 }],
    red: [{ type: "knight", x: 810, y: 300 }],
    blueCode: "",
    redCode: "",
    timeLimit: 30,
    seed: 1,
    ...over,
  };
}

export const unit = (type: SpawnSpec["type"], x: number, y: number): SpawnSpec => ({ type, x, y });

/** Runs a battle and returns every frame. */
export function frames(s: BattleSetup): Frame[] {
  const out: Frame[] = [];
  runBattle(s, { onFrames: (f) => out.push(...f) });
  return out;
}

/** Steps a prepared battle `n` ticks and returns it. */
export function stepped(s: BattleSetup, n: number): Battle {
  const b = new Battle(s);
  const err = b.prepare();
  if (err) throw new Error(JSON.stringify(err.message));
  for (let i = 0; i < n && !b.result; i++) b.step();
  return b;
}
