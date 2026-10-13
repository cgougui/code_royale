import type { LevelSpec } from "../types";
import { column, waves } from "./layout";

export const endless: LevelSpec = {
  id: "endless",
  num: 11,
  color: "indigo",
  newApi: [],
  blue: [
    ...column("knight", 250, 2, 160),
    ...column("archer", 170, 2, 100),
    { type: "scout", x: 110, y: 200 },
    { type: "mage", x: 110, y: 400 },
  ],
  red: column("goblin", 780, 3, 100),
  bushes: [
    { x: 230, y: 110, r: 50 },
    { x: 230, y: 490, r: 50 },
  ],
  rocks: [
    { x: 470, y: 220, r: 32 },
    { x: 470, y: 380, r: 32 },
  ],
  endless: true,
  unevenArmies: true,
  redStrategy: "endless-horde",
  timeLimit: 900,
  stars: [waves(5), waves(8), waves(12)],
};
