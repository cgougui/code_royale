import type { Circle } from "@code-royale/engine";
import type { LevelSpec } from "../types";
import { column, mirror, win, survivors } from "./layout";

const BUSHES: Circle[] = [
  { x: 300, y: 140, r: 62 },
  { x: 230, y: 300, r: 55 },
  { x: 300, y: 460, r: 62 },
  { x: 640, y: 300, r: 50 },
];

export const ambush: LevelSpec = {
  id: "ambush",
  num: 8,
  color: "yellow",
  newApi: ["me.hide()", "me.isHidden", "me.inBush"],
  blue: [...column("knight", 150, 2, 160), ...column("archer", 90, 2, 300), { type: "mage", x: 90, y: 300 }],
  red: mirror([...column("knight", 150, 2, 160), ...column("archer", 90, 2, 300), { type: "mage", x: 90, y: 300 }]),
  bushes: BUSHES,
  redStrategy: "march",
  timeLimit: 100,
  stars: [win, survivors(3), survivors(4)],
};
