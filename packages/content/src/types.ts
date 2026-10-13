/**
 * Content types. Every piece of content comes in two halves:
 * - a spec: the game data (armies, terrain, goals…), the same in every language;
 * - a text: what players read, one per locale (see `locales/`).
 * `contentFor(locale)` joins them into the localized `Level`, `Strategy` and `ApiGroup` the app shows.
 */
import type { BattleResult, Circle, ItemKind, ItemSpawnSpec, SpawnSpec, Team, UnitType } from "@code-royale/engine";
import type { ApiGroupId, ApiItemName } from "./api-docs";

/** Campaign levels. Progress is saved by id, so never rename one. */
export type LevelId =
  | "training"
  | "together"
  | "arrows"
  | "scout"
  | "potions"
  | "specials"
  | "fire"
  | "ambush"
  | "ogre"
  | "royale"
  | "endless";

/** Built-in scripts: the red brains and the blue starter code. */
export type StrategyId =
  | "sleepy"
  | "pack"
  | "archer-hunters"
  | "forest-ambush"
  | "treasure-hunters"
  | "march"
  | "ogre-king"
  | "champion"
  | "endless-horde"
  | "starter";

/** What a star asks for. Plain data: the label comes from the locale, the test from `goals.ts`. */
export type Goal =
  | { kind: "win" }
  | { kind: "survivors"; count: number }
  | { kind: "flawless" }
  | { kind: "battleCry" }
  | { kind: "waves"; count: number };

/** The language-independent part of a level. */
export interface LevelSpec {
  id: LevelId;
  num: number;
  /** New commands this level introduces, shown as chips on the mission card (code: never translated). */
  newApi: string[];
  color: string;
  /** A spawn's `name`, if any, is a key into the level text's `names`. */
  blue: SpawnSpec[];
  red: SpawnSpec[];
  waves?: SpawnSpec[][];
  endless?: boolean;
  items?: ItemSpawnSpec[];
  bushes?: Circle[];
  rocks?: Circle[];
  /** The armies are different on purpose. The level text must then explain why in its `note`. */
  unevenArmies?: true;
  /** The red team's brain. */
  redStrategy: StrategyId;
  timeLimit: number;
  stars: [Goal, Goal, Goal];
}

export interface Hint {
  title: string;
  text: string;
  /** Code that the player can insert. Comments and strings may be translated, the code itself may not. */
  code?: string;
}

/** What players read about a level, in one language. */
export interface LevelText {
  title: string;
  tagline: string;
  story: string;
  learn: string;
  /** Required when the level spec has `unevenArmies`. */
  note?: string;
  hints: Hint[];
  /** Display names of named spawns (see `LevelSpec.blue`). */
  names?: Record<string, string>;
}

export interface StrategyText {
  name: string;
  /**
   * The script, with comments and say() texts in this language.
   * Its code must stay identical to the English one: a test compares them token by token.
   */
  code: string;
}

export interface GoalText {
  win: string;
  survivors: (count: number) => string;
  flawless: string;
  battleCry: string;
  waves: (count: number) => string;
}

export interface UnitText {
  name: string;
  description: string;
  special: { name: string; description: string };
}

export interface ItemText {
  name: string;
  description: string;
}

export interface ApiItemText {
  /** How it looks when used. */
  usage: string;
  description: string;
  example?: string;
}

export type ApiText = {
  [G in ApiGroupId]: { title: string; intro: string; items: { [I in ApiItemName<G>]: ApiItemText } };
};

/**
 * Everything players read in the content, for one language.
 * A locale is a value of this type: TypeScript reports anything missing or misspelled.
 */
export interface ContentText {
  levels: Record<LevelId, LevelText>;
  goals: GoalText;
  strategies: Record<StrategyId, StrategyText>;
  api: ApiText;
  units: Record<UnitType, UnitText>;
  items: Record<ItemKind, ItemText>;
}

// ---- Localized content, as the app uses it.

/** A script shipped with the game (a red AI, or the blue starter code). */
export interface Strategy extends StrategyText {
  id: StrategyId;
  team: Team;
}

export interface StarGoal {
  goal: Goal;
  label: string;
}

export interface Level extends Omit<LevelSpec, "stars" | "redStrategy">, Omit<LevelText, "names"> {
  stars: [StarGoal, StarGoal, StarGoal];
  redStrategy: Strategy;
}

export interface ApiDoc extends ApiItemText {
  /** Text inserted by autocomplete. */
  name: string;
  kind: "method" | "property" | "variable" | "function";
}

export interface ApiGroup {
  id: ApiGroupId;
  title: string;
  emoji: string;
  intro: string;
  owner: "me" | "global" | "unit";
  items: ApiDoc[];
}

/** Checks a star goal against a battle result. */
export type GoalTest = (r: BattleResult) => boolean;
