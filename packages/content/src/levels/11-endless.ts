import { endlessHorde } from "../strategies";
import type { Level } from "../types";
import { column } from "./layout";

export const endless: Level = {
  id: "endless",
  num: 11,
  title: "Endless Horde",
  tagline: "How long can you survive?",
  color: "indigo",
  story:
    "Wave after wave after wave. Each one is bigger than the last, and an ogre shows up every 7 waves. Between waves your fighters patch themselves up a little. How far can your code go?",
  learn: "No new tricks: this is where your best code shines. Beat your own record!",
  newApi: [],
  blue: [
    ...column("knight", 250, 2, 160),
    ...column("archer", 170, 2, 100),
    { type: "scout", x: 110, y: 200 },
    { type: "mage", x: 110, y: 400 },
  ],
  red: column("goblin", 780, 3, 100),
  bushes: [
    { x: 230, y: 110, r: 50 },
    { x: 230, y: 490, r: 50 },
  ],
  rocks: [
    { x: 470, y: 220, r: 32 },
    { x: 470, y: 380, r: 32 },
  ],
  endless: true,
  note: "🌊 Survival mode: wave after wave of red fighters. The waves are not the same as your army; they just keep getting bigger.",
  redStrategy: endlessHorde,
  timeLimit: 900,
  stars: [
    { label: "Clear 5 waves", test: (r) => r.wave >= 5 },
    { label: "Clear 8 waves", test: (r) => r.wave >= 8 },
    { label: "Clear 12 waves", test: (r) => r.wave >= 12 },
  ],
  hints: [
    {
      title: "Survive, then fight",
      text: "Hurt fighters can step back behind the knights, or hide in a bush until things calm down.",
      code: `if (me.health < me.maxHealth * 0.3 && me.type != "knight") {\n  me.hide()\n  return\n}`,
    },
    {
      title: "return",
      text: "return stops your code for this fighter right away. It's a handy way to say \"I'm done deciding!\"",
    },
  ],
};
