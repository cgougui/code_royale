/** Content types: what a level and a built-in strategy are made of. */
import type { BattleResult, Circle, ItemSpawnSpec, SpawnSpec, Team } from "@code-royale/engine";

/** A script shipped with the game (a red AI, or the blue starter code). */
export interface Strategy {
  id: string;
  name: string;
  team: Team;
  code: string;
}

export interface StarGoal {
  label: string;
  test: (r: BattleResult) => boolean;
}

export interface Hint {
  title: string;
  text: string;
  code?: string;
}

export interface Level {
  id: string;
  num: number;
  title: string;
  tagline: string;
  story: string;
  learn: string;
  /** New commands this level introduces, shown as chips on the mission card. */
  newApi: string[];
  color: string;
  blue: SpawnSpec[];
  red: SpawnSpec[];
  waves?: SpawnSpec[][];
  endless?: boolean;
  items?: ItemSpawnSpec[];
  bushes?: Circle[];
  rocks?: Circle[];
  /** Shown on the mission card when the armies are different on purpose. */
  note?: string;
  /** The red team's brain. */
  redStrategy: Strategy;
  timeLimit: number;
  stars: [StarGoal, StarGoal, StarGoal];
  hints: Hint[];
}
