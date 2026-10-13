import type { Circle } from "@code-royale/engine";
import type { LevelSpec } from "../types";
import { column, center, inBush, win, survivors, flawless } from "./layout";

const BUSHES: Circle[] = [
  { x: 430, y: 120, r: 50 },
  { x: 450, y: 300, r: 55 },
  { x: 430, y: 480, r: 50 },
  { x: 680, y: 190, r: 55 },
  { x: 680, y: 410, r: 55 },
];

export const scout: LevelSpec = {
  id: "scout",
  num: 4,
  color: "cyan",
  newApi: ["me.follow(friend, distance)", "me.circle(thing, distance)", "me.sight"],
  blue: [{ type: "scout", x: 200, y: 300 }, ...column("knight", 150, 2, 120), ...column("archer", 90, 2, 120)],
  red: [
    ...inBush("knight", BUSHES[1], 2),
    { type: "scout", ...center(BUSHES[1]) },
    ...inBush("archer", BUSHES[3], 1),
    ...inBush("archer", BUSHES[4], 1),
  ],
  bushes: BUSHES,
  redStrategy: "forest-ambush",
  timeLimit: 90,
  stars: [win, survivors(4), flawless],
};
