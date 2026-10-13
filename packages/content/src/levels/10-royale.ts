import type { Circle } from "@code-royale/engine";
import type { LevelSpec } from "../types";
import { column, win, survivors } from "./layout";

const BUSHES: Circle[] = [
  { x: 330, y: 120, r: 50 },
  { x: 330, y: 480, r: 50 },
  { x: 630, y: 120, r: 50 },
  { x: 630, y: 480, r: 50 },
  { x: 480, y: 300, r: 45 },
];

export const royale: LevelSpec = {
  id: "royale",
  num: 10,
  color: "pink",
  newApi: ["team"],
  blue: [
    ...column("knight", 230, 2, 160),
    ...column("archer", 150, 2, 100),
    { type: "scout", x: 110, y: 200 },
    { type: "mage", x: 110, y: 400 },
  ],
  red: [
    ...column("knight", 730, 2, 160),
    ...column("archer", 810, 2, 100),
    { type: "scout", x: 850, y: 200 },
    { type: "mage", x: 850, y: 400 },
  ],
  bushes: BUSHES,
  rocks: [
    { x: 480, y: 160, r: 30 },
    { x: 480, y: 440, r: 30 },
  ],
  items: [
    { kind: "rage", x: 480, y: 300, at: 6 },
    { kind: "potion", x: 480, y: 70, at: 15 },
    { kind: "potion", x: 480, y: 530, at: 15 },
    { kind: "shield", x: 480, y: 300, at: 25 },
  ],
  redStrategy: "champion",
  timeLimit: 120,
  stars: [win, survivors(3), survivors(5)],
};
