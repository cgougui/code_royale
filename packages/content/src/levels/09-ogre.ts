import { ogreKing } from "../strategies";
import type { Level } from "../types";
import { column, win, survivors } from "./layout";

export const ogre: Level = {
  id: "ogre",
  num: 9,
  title: "The Ogre King",
  tagline: "A boss battle!",
  color: "violet",
  story:
    "First defeat the goblin guards… then the OGRE KING himself stomps into the arena. 900 health. His STOMP hurts everyone around him. Stay away when he's ready to stomp, and use the rocks to keep him off your archers!",
  learn: "You can check an enemy's specialReady too, to dodge their special move. Rocks block the way AND block sight: hide behind one to break line of sight.",
  newApi: ["enemy.specialReady", "me.moveAwayFrom()"],
  blue: [...column("knight", 250, 2, 140), ...column("archer", 160, 2, 200), { type: "scout", x: 110, y: 300 }],
  red: column("goblin", 760, 6, 75),
  waves: [[{ type: "ogre", x: 820, y: 300, name: "Ogre King" }, ...column("goblin", 870, 2, 200)]],
  rocks: [
    { x: 420, y: 170, r: 40 },
    { x: 420, y: 430, r: 40 },
    { x: 620, y: 300, r: 34 },
  ],
  items: [
    { kind: "potion", x: 480, y: 80, at: 15 },
    { kind: "potion", x: 480, y: 520, at: 15 },
    { kind: "rage", x: 300, y: 300, at: 22 },
  ],
  note: "👹 Boss battle: the red army is different on purpose. A few goblins, then one giant ogre against your whole team.",
  redStrategy: ogreKing,
  timeLimit: 120,
  stars: [win, survivors(3), survivors(4)],
  hints: [
    {
      title: "Spot the boss",
      text: "Find the ogre and remember it in a variable (it's undefined until someone sees him).",
      code: `let boss = enemies.find(e => e.type == "ogre")`,
    },
    {
      title: "Dodge the stomp",
      text: "If the boss can stomp and you're close, back off! Otherwise, attack.",
      code: `let boss = enemies.find(e => e.type == "ogre")\nif (boss && boss.specialReady && me.distanceTo(boss) < 140) {\n  me.moveAwayFrom(boss)\n} else if (enemy) {\n  me.attack(enemy)\n}`,
    },
    {
      title: "Archers win this",
      text: "The ogre is slow. Archers that keep escaping while shooting can beat him almost alone!",
    },
  ],
};
