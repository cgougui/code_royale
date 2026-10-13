/** What each kind of star goal checks, and its label in a given language. */
import type { BattleResult } from "@code-royale/engine";
import type { Goal, GoalText } from "./types";

export function goalMet(goal: Goal, r: BattleResult): boolean {
  const won = r.winner === "blue";
  switch (goal.kind) {
    case "win":
      return won;
    case "survivors":
      return won && r.blueAlive >= goal.count;
    case "flawless":
      return won && r.blueAlive === r.blueTotal;
    case "battleCry":
      return won && r.said;
    case "waves":
      return r.wave >= goal.count;
  }
}

export function goalLabel(goal: Goal, text: GoalText): string {
  switch (goal.kind) {
    case "survivors":
      return text.survivors(goal.count);
    case "waves":
      return text.waves(goal.count);
    default:
      return text[goal.kind];
  }
}
