import { march } from "../strategies";
import type { Level } from "../types";
import { column, mirror, win, survivors } from "./layout";

export const fire: Level = {
  id: "fire",
  num: 7,
  title: "Fire & Fury",
  tagline: "Mages burn crowds",
  color: "red",
  story:
    "Mages! Their fireballs burn everyone around the target, and their Meteor special can wipe out a whole crowd. The red army walks in a tight bunch… perfect for a meteor!",
  learn: "Area attacks are best where enemies are bunched together. me.special(x, y) can also aim at a place!",
  newApi: ["me.special(x, y)", "for (let e of enemies)"],
  blue: [...column("knight", 230, 2, 140), ...column("mage", 130, 2, 120)],
  red: mirror([...column("knight", 230, 2, 140), ...column("mage", 130, 2, 120)]),
  rocks: [{ x: 480, y: 300, r: 36 }],
  redStrategy: march,
  timeLimit: 90,
  stars: [win, survivors(3), survivors(4)],
  hints: [
    {
      title: "Meteor time",
      text: "Drop a meteor on the nearest enemy when it's ready.",
      code: `if (me.type == "mage" && me.specialReady && enemy) {\n  me.special(enemy)\n}`,
    },
    {
      title: "Find the crowd",
      text: "Look for the enemy with the most friends around it, and aim there!",
      code: `let best = null\nlet most = 0\nfor (let e of enemies) {\n  let crowd = enemies.filter(o => distance(o, e) < 80).length\n  if (crowd > most) {\n    most = crowd\n    best = e\n  }\n}`,
    },
    {
      title: "Mages are fragile",
      text: "Like archers, mages should me.escape() when knights get too close.",
    },
  ],
};
