import type { LevelSpec } from "../types";
import { column, mirror, win, survivors } from "./layout";

export const fire: LevelSpec = {
  id: "fire",
  num: 7,
  color: "red",
  newApi: ["me.special(x, y)", "for (let e of enemies)"],
  blue: [...column("knight", 230, 2, 140), ...column("mage", 130, 2, 120)],
  red: mirror([...column("knight", 230, 2, 140), ...column("mage", 130, 2, 120)]),
  rocks: [{ x: 480, y: 300, r: 36 }],
  redStrategy: "march",
  timeLimit: 90,
  stars: [win, survivors(3), survivors(4)],
};
