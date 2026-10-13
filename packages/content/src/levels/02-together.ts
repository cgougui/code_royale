import type { Circle } from "@code-royale/engine";
import type { LevelSpec } from "../types";
import { column, mirror, win, survivors, flawless } from "./layout";

const BUSHES: Circle[] = [
  { x: 430, y: 150, r: 55 },
  { x: 560, y: 450, r: 55 },
  { x: 770, y: 270, r: 60 },
];

export const together: LevelSpec = {
  id: "together",
  num: 2,
  color: "green",
  newApi: ["me.index", "me.follow()", "allies"],
  blue: column("knight", 150, 4, 80),
  red: mirror(column("knight", 150, 4, 80)),
  bushes: BUSHES,
  redStrategy: "pack",
  timeLimit: 90,
  stars: [win, survivors(3), flawless],
};
