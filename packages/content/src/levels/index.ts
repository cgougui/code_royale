/** The campaign, in order. To add a level: create a file here and append it below. */
import type { BattleResult } from "@code-royale/engine";
import type { Level } from "../types";
import { training } from "./01-training";
import { together } from "./02-together";
import { arrows } from "./03-arrows";
import { scout } from "./04-scout";
import { potions } from "./05-potions";
import { specials } from "./06-specials";
import { fire } from "./07-fire";
import { ambush } from "./08-ambush";
import { ogre } from "./09-ogre";
import { royale } from "./10-royale";
import { endless } from "./11-endless";

export const LEVELS: Level[] = [training, together, arrows, scout, potions, specials, fire, ambush, ogre, royale, endless];

export function levelById(id: string): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

/** Which of the level's three star goals a battle result earns. */
export function starsFor(level: Level, r: BattleResult): boolean[] {
  return level.stars.map((s) => s.test(r));
}
