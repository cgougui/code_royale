import type { BattleSetup } from "@code-royale/engine";
import type { Level } from "./types";

/** Turns a level and the player's code into everything the engine needs to run the battle. */
export function toBattleSetup(level: Level, blueCode: string, seed: number): BattleSetup {
  return {
    blue: level.blue,
    red: level.red,
    blueCode,
    redCode: level.redStrategy.code,
    items: level.items,
    bushes: level.bushes,
    rocks: level.rocks,
    timeLimit: level.timeLimit,
    waves: level.waves,
    endless: level.endless,
    seed,
  };
}
