import type { LevelSpec } from "../types";
import { column, win, survivors } from "./layout";

export const potions: LevelSpec = {
  id: "potions",
  num: 5,
  color: "orange",
  newApi: ["items", "me.nearestItem()", "me.moveTo()"],
  blue: column("knight", 180, 4, 85),
  red: column("knight", 780, 4, 85),
  rocks: [
    { x: 400, y: 300, r: 30 },
    { x: 560, y: 300, r: 30 },
  ],
  items: [
    { kind: "rage", x: 480, y: 300, at: 0 },
    { kind: "shield", x: 400, y: 160, at: 0 },
    { kind: "shield", x: 400, y: 440, at: 0 },
    { kind: "potion", x: 560, y: 160, at: 4 },
    { kind: "potion", x: 560, y: 440, at: 4 },
    { kind: "rage", x: 480, y: 110, at: 9 },
    { kind: "rage", x: 480, y: 490, at: 9 },
    { kind: "potion", x: 290, y: 300, at: 14 },
    { kind: "potion", x: 670, y: 300, at: 14 },
  ],
  redStrategy: "treasure-hunters",
  timeLimit: 80,
  stars: [win, survivors(3), survivors(4)],
};
