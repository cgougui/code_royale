import type { Circle } from "@code-royale/engine";
import { march } from "../strategies";
import type { Level } from "../types";
import { column, mirror, win, survivors } from "./layout";

const BUSHES: Circle[] = [
  { x: 300, y: 140, r: 62 },
  { x: 230, y: 300, r: 55 },
  { x: 300, y: 460, r: 62 },
  { x: 640, y: 300, r: 50 },
];

export const ambush: Level = {
  id: "ambush",
  num: 8,
  title: "Ambush!",
  tagline: "Now YOU hide in the bushes",
  color: "yellow",
  story:
    "The red army is marching on your camp. Same army as yours… so don't fight fair! Hide in the bushes, let them walk into your trap, and strike first. Careful: attacking from a bush gives your position away for a moment.",
  learn: "me.hide() walks to the nearest bush. me.isHidden tells if you're hidden right now. Enemies only spot hidden fighters when they're very close.",
  newApi: ["me.hide()", "me.isHidden", "me.inBush"],
  blue: [...column("knight", 150, 2, 160), ...column("archer", 90, 2, 300), { type: "mage", x: 90, y: 300 }],
  red: mirror([...column("knight", 150, 2, 160), ...column("archer", 90, 2, 300), { type: "mage", x: 90, y: 300 }]),
  bushes: BUSHES,
  redStrategy: march,
  timeLimit: 100,
  stars: [win, survivors(3), survivors(4)],
  hints: [
    {
      title: "Lie in wait",
      text: "Hide until an enemy shows up, then attack.",
      code: `let enemy = me.nearestEnemy()\nif (enemy) {\n  me.attack(enemy)\n} else {\n  me.hide()\n}`,
    },
    {
      title: "Strike when they're close",
      text: "Archers have a long range. Knights should stay hidden until the enemy is REALLY close, so the enemy gets surprised.",
      code: `if (me.type == "knight" && enemy && me.distanceTo(enemy) > 100) {\n  me.hide()\n}`,
    },
    {
      title: "Spotted? Change bush!",
      text: "If me.isSpotted is true, the enemy knows where you are. Archers could escape and come back later!",
    },
  ],
};
