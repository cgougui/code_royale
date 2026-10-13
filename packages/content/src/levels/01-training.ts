import type { LevelSpec } from "../types";
import { battleCry, column, win, flawless } from "./layout";

export const training: LevelSpec = {
  id: "training",
  num: 1,
  color: "teal",
  newApi: ["me.nearestEnemy()", "me.attack()", "me.explore()"],
  blue: column("knight", 150, 3, 90),
  // Same army, but the sleepy red knights are scattered: find them one by one!
  red: [
    { type: "knight", x: 560, y: 300 },
    { type: "knight", x: 830, y: 110 },
    { type: "knight", x: 830, y: 490 },
  ],
  bushes: [
    { x: 480, y: 110, r: 42 },
    { x: 480, y: 490, r: 42 },
  ],
  rocks: [{ x: 600, y: 300, r: 32 }],
  redStrategy: "sleepy",
  timeLimit: 60,
  stars: [win, flawless, battleCry],
};
