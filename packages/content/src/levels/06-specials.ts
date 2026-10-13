import type { LevelSpec } from "../types";
import { column, mirror, win, survivors } from "./layout";

export const specials: LevelSpec = {
  id: "specials",
  num: 6,
  color: "grape",
  newApi: ["me.specialReady", "me.special()", "me.enemiesNear()"],
  blue: [...column("knight", 220, 3, 100), ...column("archer", 130, 2, 150)],
  red: mirror([...column("knight", 220, 3, 100), ...column("archer", 130, 2, 150)]),
  redStrategy: "march",
  timeLimit: 90,
  stars: [win, survivors(3), survivors(4)],
};
