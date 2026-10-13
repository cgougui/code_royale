import { sleepy } from "../strategies";
import type { Level } from "../types";
import { column, win, flawless } from "./layout";

export const training: Level = {
  id: "training",
  num: 1,
  title: "Training Grounds",
  tagline: "Find them, then fight them",
  color: "teal",
  story:
    "Three red knights are dozing in different corners of the training field. Your knights can only spot enemies inside their detection radius (the bright circle around them). Read the code on the left, then press FIGHT!",
  learn: "me.nearestEnemy() only finds enemies your team can SEE. If nobody is in sight it gives null, so use if / else: attack when you see someone, explore when you don't.",
  newApi: ["me.nearestEnemy()", "me.attack()", "me.explore()"],
  blue: column("knight", 150, 3, 90),
  // Same army, but the sleepy red knights are scattered: find them one by one!
  red: [
    { type: "knight", x: 560, y: 300 },
    { type: "knight", x: 830, y: 110 },
    { type: "knight", x: 830, y: 490 },
  ],
  bushes: [
    { x: 480, y: 110, r: 42 },
    { x: 480, y: 490, r: 42 },
  ],
  rocks: [{ x: 600, y: 300, r: 32 }],
  redStrategy: sleepy,
  timeLimit: 60,
  stars: [win, flawless, { label: "Make a knight shout a battle cry (hint 1)", test: (r) => r.winner === "blue" && r.said }],
  hints: [
    {
      title: "Shout it out!",
      text: "Fighters can talk. Add this line at the end and watch the arena:",
      code: `me.say("For the Blue Kingdom!")`,
    },
    {
      title: "Try it without explore",
      text: "Delete the else part and press FIGHT. Your knights stand still: they can't see anybody! That's why we explore.",
    },
  ],
};
