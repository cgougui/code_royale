import { treasureHunters } from "../strategies";
import type { Level } from "../types";
import { column, win, survivors } from "./layout";

export const potions: Level = {
  id: "potions",
  num: 5,
  title: "Treasure Hunt",
  tagline: "Grab the power-ups",
  color: "orange",
  story:
    "Magic treasures appear in the arena! 🧪 Potions heal, 💎 Rage Gems double damage, 🔵 Shield Orbs block hits. The red knights are greedy. Will you let them grab everything?",
  learn: "The items list holds every treasure (you can always see treasures). me.nearestItem() finds the closest one, and me.moveTo() walks there to pick it up.",
  newApi: ["items", "me.nearestItem()", "me.moveTo()"],
  blue: column("knight", 180, 4, 85),
  red: column("knight", 780, 4, 85),
  rocks: [
    { x: 400, y: 300, r: 30 },
    { x: 560, y: 300, r: 30 },
  ],
  items: [
    { kind: "rage", x: 480, y: 300, at: 0 },
    { kind: "shield", x: 400, y: 160, at: 0 },
    { kind: "shield", x: 400, y: 440, at: 0 },
    { kind: "potion", x: 560, y: 160, at: 4 },
    { kind: "potion", x: 560, y: 440, at: 4 },
    { kind: "rage", x: 480, y: 110, at: 9 },
    { kind: "rage", x: 480, y: 490, at: 9 },
    { kind: "potion", x: 290, y: 300, at: 14 },
    { kind: "potion", x: 670, y: 300, at: 14 },
  ],
  redStrategy: treasureHunters,
  timeLimit: 80,
  stars: [win, survivors(3), survivors(4)],
  hints: [
    {
      title: "Go get it",
      text: "Walk to the nearest treasure if there is one.",
      code: `let item = me.nearestItem()\nlet enemy = me.nearestEnemy()\nif (item) {\n  me.moveTo(item)\n} else if (enemy) {\n  me.attack(enemy)\n} else {\n  me.explore()\n}`,
    },
    {
      title: "Only if it's close",
      text: "Running across the whole arena is risky. Only grab treasures that are close!",
      code: `if (item && me.distanceTo(item) < 200) {\n  me.moveTo(item)\n}`,
    },
    {
      title: "Order matters",
      text: "When your code gives two orders, the LAST one wins. So put the most important order at the end, or use else.",
    },
  ],
};
