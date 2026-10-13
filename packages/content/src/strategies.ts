/** Built-in scripts: the red team's brains, and the blue starter code. Their code is in the locales. */
import type { Team } from "@code-royale/engine";
import type { StrategyId } from "./types";

export const STRATEGY_TEAMS: Record<StrategyId, Team> = {
  sleepy: "red",
  pack: "red",
  "archer-hunters": "red",
  "forest-ambush": "red",
  "treasure-hunters": "red",
  march: "red",
  "ogre-king": "red",
  champion: "red",
  "endless-horde": "red",
  starter: "blue",
};
