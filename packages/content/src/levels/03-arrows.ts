import { archerHunters } from "../strategies";
import type { Level } from "../types";
import { column, mirror, win, survivors, flawless } from "./layout";

export const arrows: Level = {
  id: "arrows",
  num: 3,
  title: "Arrows Away",
  tagline: "Hit, then run",
  color: "lime",
  story:
    "You've got ARCHERS now! They see far and shoot far, but they're fragile. The red knights are sneaky: they rush straight at your archers. Maybe archers shouldn't wait to get hit?",
  learn: "me.type tells what kind of fighter runs the code. me.distanceTo() measures how close a danger is, and me.escape() runs away from every enemy you can see.",
  newApi: ["me.type", "me.distanceTo()", "me.escape()"],
  blue: [...column("knight", 230, 2, 120), ...column("archer", 140, 2, 160)],
  red: mirror([...column("knight", 230, 2, 120), ...column("archer", 140, 2, 160)]),
  rocks: [
    { x: 480, y: 190, r: 38 },
    { x: 480, y: 410, r: 38 },
  ],
  redStrategy: archerHunters,
  timeLimit: 75,
  stars: [win, survivors(3), flawless],
  hints: [
    {
      title: "Different jobs",
      text: "Use if to give different orders to each type of fighter.",
      code: `if (me.type == "archer") {\n  // archer stuff\n} else {\n  // knight stuff\n}`,
    },
    {
      title: "Too close? Run!",
      text: "An archer that sees an enemy too close runs away. Otherwise it shoots!",
      code: `let enemy = me.nearestEnemy()\nif (!enemy) {\n  me.explore()\n} else if (me.type == "archer" && me.distanceTo(enemy) < 90) {\n  me.escape()\n} else {\n  me.attack(enemy)\n}`,
    },
    {
      title: "Bodyguards",
      text: "Knights could stay next to the archers with me.follow(...) so goblins run into the knights first!",
    },
  ],
};
