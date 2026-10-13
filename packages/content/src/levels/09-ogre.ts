import type { LevelSpec } from "../types";
import { column, win, survivors } from "./layout";

export const ogre: LevelSpec = {
  id: "ogre",
  num: 9,
  color: "violet",
  newApi: ["enemy.specialReady", "me.moveAwayFrom()"],
  blue: [...column("knight", 250, 2, 140), ...column("archer", 160, 2, 200), { type: "scout", x: 110, y: 300 }],
  red: column("goblin", 760, 6, 75),
  waves: [[{ type: "ogre", x: 820, y: 300, name: "ogreKing" }, ...column("goblin", 870, 2, 200)]],
  rocks: [
    { x: 420, y: 170, r: 40 },
    { x: 420, y: 430, r: 40 },
    { x: 620, y: 300, r: 34 },
  ],
  items: [
    { kind: "potion", x: 480, y: 80, at: 15 },
    { kind: "potion", x: 480, y: 520, at: 15 },
    { kind: "rage", x: 300, y: 300, at: 22 },
  ],
  unevenArmies: true,
  redStrategy: "ogre-king",
  timeLimit: 120,
  stars: [win, survivors(3), survivors(4)],
};
