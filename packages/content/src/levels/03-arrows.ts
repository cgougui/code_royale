import type { LevelSpec } from "../types";
import { column, mirror, win, survivors, flawless } from "./layout";

export const arrows: LevelSpec = {
  id: "arrows",
  num: 3,
  color: "lime",
  newApi: ["me.type", "me.distanceTo()", "me.escape()"],
  blue: [...column("knight", 230, 2, 120), ...column("archer", 140, 2, 160)],
  red: mirror([...column("knight", 230, 2, 120), ...column("archer", 140, 2, 160)]),
  rocks: [
    { x: 480, y: 190, r: 38 },
    { x: 480, y: 410, r: 38 },
  ],
  redStrategy: "archer-hunters",
  timeLimit: 75,
  stars: [win, survivors(3), flawless],
};
