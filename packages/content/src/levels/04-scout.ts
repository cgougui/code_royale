import type { Circle } from "@code-royale/engine";
import { forestAmbush } from "../strategies";
import type { Level } from "../types";
import { column, center, inBush, win, survivors, flawless } from "./layout";

const BUSHES: Circle[] = [
  { x: 430, y: 120, r: 50 },
  { x: 450, y: 300, r: 55 },
  { x: 430, y: 480, r: 50 },
  { x: 680, y: 190, r: 55 },
  { x: 680, y: 410, r: 55 },
];

export const scout: Level = {
  id: "scout",
  num: 4,
  title: "Scout Ahead",
  tagline: "Eyes before swords",
  color: "cyan",
  story:
    "The red army is hiding in a forest full of bushes, waiting to ambush you. Meet your SCOUT 🔭: super fast, the biggest detection radius, and sharp eyes that spot enemies in bushes from far away. Whatever one fighter sees, the whole team sees!",
  learn: "Vision is shared: when the scout spots an enemy, it appears in everybody's enemies list. Send the scout first, and keep the others a safe distance behind.",
  newApi: ["me.follow(friend, distance)", "me.circle(thing, distance)", "me.sight"],
  blue: [{ type: "scout", x: 200, y: 300 }, ...column("knight", 150, 2, 120), ...column("archer", 90, 2, 120)],
  red: [
    ...inBush("knight", BUSHES[1], 2),
    { type: "scout", ...center(BUSHES[1]) },
    ...inBush("archer", BUSHES[3], 1),
    ...inBush("archer", BUSHES[4], 1),
  ],
  bushes: BUSHES,
  redStrategy: forestAmbush,
  timeLimit: 90,
  stars: [win, survivors(4), flawless],
  hints: [
    {
      title: "Scout first",
      text: "Only the scout explores. Everybody else follows the scout from a safe distance, and fights what the team sees.",
      code: `let scout = allies.find(a => a.type == "scout")\nlet enemy = me.nearestEnemy()\nif (me.type == "scout") {\n  me.explore()\n} else if (enemy) {\n  me.attack(enemy)\n} else if (scout) {\n  me.follow(scout, 150)\n}`,
    },
    {
      title: "Found them? Watch from a safe distance!",
      text: "When the scout spots enemies, it shouldn't run into them. me.circle(enemy, 200) makes it walk in circles around them, far enough to stay safe, close enough to keep watching.",
      code: `if (me.type == "scout") {\n  if (enemy) me.circle(enemy, 200)   // keep an eye on them\n  else me.explore()\n}`,
    },
    {
      title: "Snipe the ambush",
      text: "The red fighters only jump out of their bush when you come close. So let the archers shoot whatever the scout sees, and keep the knights back until goblins come out:",
      code: `if (enemy && (me.type == "archer" || me.distanceTo(enemy) < 120)) {\n  me.attack(enemy)\n}`,
    },
  ],
};
