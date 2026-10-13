import type { Circle } from "@code-royale/engine";
import { pack } from "../strategies";
import type { Level } from "../types";
import { column, mirror, win, survivors, flawless } from "./layout";

const BUSHES: Circle[] = [
  { x: 430, y: 150, r: 55 },
  { x: 560, y: 450, r: 55 },
  { x: 770, y: 270, r: 60 },
];

export const together: Level = {
  id: "together",
  num: 2,
  title: "Stick Together",
  tagline: "Don't walk into an ambush alone",
  color: "green",
  story:
    "The red knights move as a PACK. If your knights explore on their own, the pack catches them one by one! A smart team moves together, and gangs up on the same enemy.",
  learn: "me.index is your fighter's number (0, 1, 2…). Let fighter 0 lead the way and tell the others to me.follow() the leader.",
  newApi: ["me.index", "me.follow()", "allies"],
  blue: column("knight", 150, 4, 80),
  red: mirror(column("knight", 150, 4, 80)),
  bushes: BUSHES,
  redStrategy: pack,
  timeLimit: 90,
  stars: [win, survivors(3), flawless],
  hints: [
    {
      title: "Who's the leader?",
      text: "allies is the list of your other fighters. The one with index 0 can be the leader.",
      code: `let leader = allies.find(a => a.index == 0)`,
    },
    {
      title: "Follow the leader",
      text: "The leader explores, the others follow it. Everybody attacks when they see an enemy.",
      code: `let enemy = me.nearestEnemy()\nlet leader = allies.find(a => a.index == 0)\nif (enemy) {\n  me.attack(enemy)\n} else if (leader) {\n  me.follow(leader)\n} else {\n  me.explore()\n}`,
    },
    {
      title: "Gang up!",
      text: "When all your knights hit the SAME enemy, it goes down fast. Try me.weakestEnemy() instead of me.nearestEnemy().",
    },
  ],
};
