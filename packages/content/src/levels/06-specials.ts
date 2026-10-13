import { march } from "../strategies";
import type { Level } from "../types";
import { column, mirror, win, survivors } from "./layout";

export const specials: Level = {
  id: "specials",
  num: 6,
  title: "Special Moves",
  tagline: "Every fighter has a secret power",
  color: "grape",
  story:
    "The red army marches on your camp, all together. In a fair fight, who wins? The one who uses special moves! Every fighter has one: Knights spin in a Whirlwind, Archers fire a Power Shot through everyone, and Scouts vanish in a Smoke Bomb.",
  learn: "me.specialReady is true when the special move is charged (a ⭐ blinks next to the health bar). me.special() uses it, then it needs a few seconds to recharge.",
  newApi: ["me.specialReady", "me.special()", "me.enemiesNear()"],
  blue: [...column("knight", 220, 3, 100), ...column("archer", 130, 2, 150)],
  red: mirror([...column("knight", 220, 3, 100), ...column("archer", 130, 2, 150)]),
  redStrategy: march,
  timeLimit: 90,
  stars: [win, survivors(3), survivors(4)],
  hints: [
    {
      title: "Use it when it's ready",
      text: "Put this before your attack line.",
      code: `if (me.specialReady && enemy) {\n  me.special(enemy)\n}`,
    },
    {
      title: "Wait for the perfect moment",
      text: "A Whirlwind is best when MANY enemies are close. me.enemiesNear(70) gives a list of enemies close to you. .length tells how many!",
      code: `if (me.type == "knight" && me.specialReady && me.enemiesNear(70).length >= 3) {\n  me.special()\n}`,
    },
    {
      title: "Hold the line",
      text: "The red army is coming to YOU. Instead of exploring, maybe me.wait() in a good spot until they arrive?",
    },
  ],
};
