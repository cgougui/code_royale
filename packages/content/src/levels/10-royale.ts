import type { Circle } from "@code-royale/engine";
import { champion } from "../strategies";
import type { Level } from "../types";
import { column, win, survivors } from "./layout";

const BUSHES: Circle[] = [
  { x: 330, y: 120, r: 50 },
  { x: 330, y: 480, r: 50 },
  { x: 630, y: 120, r: 50 },
  { x: 630, y: 480, r: 50 },
  { x: 480, y: 300, r: 45 },
];

export const royale: Level = {
  id: "royale",
  num: 10,
  title: "Code Royale",
  tagline: "Face the Red Champion",
  color: "pink",
  story:
    "The final duel! The Red Champion commands the exact same army as you, and their code is VERY clever: they scout, follow, focus weak targets, escape when hurt and use specials. Only the best commander wins the crown. 👑",
  learn: "Everything you learned, together. Peek at the champion's code after a defeat to learn their tricks!",
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
  redStrategy: champion,
  timeLimit: 120,
  stars: [win, survivors(3), survivors(5)],
  hints: [
    {
      title: "Know your enemy",
      text: "Lose once, then press \"Spy on Red\" to read the champion's code. Then beat it!",
    },
    {
      title: "Team memory",
      text: "team is an object shared by all your fighters. One fighter can choose a target and everybody follows!",
      code: `if (!team.target || !enemies.find(e => e.id == team.target.id)) {\n  team.target = me.weakestEnemy()\n}\nlet target = team.target && enemies.find(e => e.id == team.target.id)`,
    },
    {
      title: "Strike from the shadows",
      text: "The bushes in the corners and the middle are perfect for an ambush…",
    },
  ],
};
