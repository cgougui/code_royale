import type { BattleResult, ItemSpawnSpec, SpawnSpec, UnitType } from "./types";

export interface StarGoal {
  label: string;
  test: (r: BattleResult) => boolean;
}

export interface Hint {
  title: string;
  text: string;
  code?: string;
}

export interface Level {
  id: string;
  num: number;
  title: string;
  tagline: string;
  story: string;
  learn: string;
  color: string;
  blue: SpawnSpec[];
  red: SpawnSpec[];
  waves?: SpawnSpec[][];
  endless?: boolean;
  items?: ItemSpawnSpec[];
  redCode: string;
  timeLimit: number;
  stars: [StarGoal, StarGoal, StarGoal];
  hints: Hint[];
}

/** Places a column of units centred vertically around `cy`. */
function column(type: UnitType, x: number, count: number, gap = 70, cy = 300): SpawnSpec[] {
  return Array.from({ length: count }, (_, i) => ({ type, x, y: cy + (i - (count - 1) / 2) * gap }));
}

const win: StarGoal = { label: "Win the battle", test: (r) => r.winner === "blue" };
const survivors = (n: number): StarGoal => ({
  label: n === 1 ? "Win with a fighter still standing… easy!" : `Win with ${n}+ fighters alive`,
  test: (r) => r.winner === "blue" && r.blueAlive >= n,
});
const fast = (s: number): StarGoal => ({ label: `Win in under ${s} seconds`, test: (r) => r.winner === "blue" && r.time < s });
const flawless: StarGoal = { label: "Nobody on your team falls", test: (r) => r.winner === "blue" && r.blueAlive === r.blueTotal };

// ------------------------------------------------------------------ red brains

const RED_SIMPLE = `// Red Goblins: charge the closest enemy!
me.attack(me.nearestEnemy())
`;

const RED_GANG = `// Goblin gang: the shaman keeps everybody healthy.
if (me.type == "healer") {
  let hurt = me.weakestAlly()
  if (hurt && hurt.health < hurt.maxHealth) {
    me.heal(hurt)
  } else {
    me.moveTo(arena.width - 120, arena.centerY)
  }
} else {
  let enemy = me.nearestEnemy()
  if (me.specialReady && me.distanceTo(enemy) < 50) me.special()
  me.attack(enemy)
}
`;

const RED_ARCHER_HUNTERS = `// Sneaky goblins go straight for the archers!
let archer = enemies.find(e => e.type == "archer")
if (archer) {
  me.attack(archer)
} else {
  me.attack(me.nearestEnemy())
}
`;

const RED_SQUAD = `// A red squad: archers shoot the weakest, knights charge.
if (me.type == "archer") {
  let near = me.nearestEnemy()
  if (near && me.distanceTo(near) < 70) {
    me.moveAwayFrom(near)
  } else {
    me.attack(me.weakestEnemy())
  }
} else {
  me.attack(me.nearestEnemy())
}
`;

const RED_ITEM_GRABBERS = `// These red knights LOVE treasure.
let item = me.nearestItem()
if (item && me.distanceTo(item) < 260) {
  me.moveTo(item)
} else {
  me.attack(me.nearestEnemy())
}
`;

const RED_HORDE = `// The horde! Goblins get angry when they are close.
let enemy = me.nearestEnemy()
if (me.type == "healer") {
  let hurt = me.weakestAlly()
  if (hurt && hurt.health < hurt.maxHealth) me.heal(hurt)
  else me.attack(enemy)
} else {
  if (me.specialReady && me.distanceTo(enemy) < 60) me.special()
  me.attack(enemy)
}
`;

const RED_OGRE = `// The Ogre King stomps anyone who gets close.
let enemy = me.nearestEnemy()
if (me.type == "ogre") {
  if (me.specialReady && me.enemiesNear(120).length > 0) {
    me.special()
    me.say("STOMP!!")
  }
  me.attack(enemy)
} else {
  if (me.specialReady && me.distanceTo(enemy) < 60) me.special()
  me.attack(enemy)
}
`;

export const RED_CHAMPION = `// The Red Champion's code. Very clever!
let near = me.nearestEnemy()
let weak = me.weakestEnemy()
if (!near) return

if (me.type == "healer") {
  let hurt = allies.filter(a => a.health < a.maxHealth * 0.6 && me.distanceTo(a) < 150)
  if (me.specialReady && hurt.length >= 2) me.special()
  let target = me.weakestAlly()
  if (target && target.health < target.maxHealth * 0.9) {
    me.heal(target)
    return
  }
  if (me.distanceTo(near) < 100) {
    me.moveAwayFrom(near)
    return
  }
  me.attack(near)
  return
}

if (me.type == "archer" || me.type == "mage") {
  if (me.specialReady) me.special(weak)
  if (me.distanceTo(near) < 90) {
    me.moveAwayFrom(near)
    return
  }
  me.attack(weak)
  return
}

if (me.type == "knight" && me.specialReady && me.enemiesNear(80).length >= 2) me.special()
if (me.type == "ogre" && me.specialReady && me.enemiesNear(120).length >= 1) me.special()
if (me.type == "goblin" && me.specialReady && me.distanceTo(near) < 60) me.special()

let item = me.nearestItem()
if (item && me.distanceTo(item) < 150 && me.health < me.maxHealth * 0.7) {
  me.moveTo(item)
  return
}
// Gang up on a weak enemy if it's not too far away.
if (me.distanceTo(weak) < 220) me.attack(weak)
else me.attack(near)
`;

const RED_ENDLESS = `// The endless horde.
let near = me.nearestEnemy()
if (!near) return
if (me.type == "healer") {
  let hurt = me.weakestAlly()
  if (hurt && hurt.health < hurt.maxHealth) { me.heal(hurt); return }
}
if ((me.type == "archer" || me.type == "mage") && me.distanceTo(near) < 70) {
  me.moveAwayFrom(near)
  return
}
if (me.specialReady && me.enemiesNear(110).length > 0) me.special(near)
me.attack(near)
`;

// ------------------------------------------------------------------ levels

export const STARTER_CODE = `// 👋 Welcome, Commander!
// This code runs for EACH of your blue fighters,
// 20 times every second. Change it, then press FIGHT!

let enemy = me.nearestEnemy()
me.attack(enemy)
`;

export const LEVELS: Level[] = [
  {
    id: "training",
    num: 1,
    title: "Training Grounds",
    tagline: "Your very first battle",
    color: "teal",
    story:
      "Three goblins have wandered onto the training field. Your knights are ready. They just need orders! Read the code on the left, then press FIGHT to see what happens.",
    learn: "Every fighter runs your code. me.nearestEnemy() finds a target, me.attack() goes for it.",
    blue: column("knight", 170, 3, 90),
    red: column("goblin", 790, 3, 90),
    redCode: RED_SIMPLE,
    timeLimit: 60,
    stars: [win, flawless, { label: "Make a knight shout a battle cry (hint 1)", test: (r) => r.winner === "blue" && r.said }],
    hints: [
      {
        title: "Make them talk!",
        text: "Fighters can talk. Try adding this line and watch the arena:",
        code: `me.say("For the Blue Kingdom!")`,
      },
      {
        title: "Who is the weakest?",
        text: "me.weakestEnemy() finds the enemy with the least health. Finishing off hurt enemies is often faster!",
        code: `let enemy = me.weakestEnemy()\nme.attack(enemy)`,
      },
    ],
  },
  {
    id: "gang",
    num: 2,
    title: "Goblin Gang",
    tagline: "Pick the right target",
    color: "green",
    story:
      "A goblin gang is back with a SHAMAN who heals them! Attacking the closest goblin isn't enough anymore. Can you find a smarter target?",
    learn: "The enemies list holds every enemy. enemies.find(...) picks a special one, like the healer.",
    blue: column("knight", 170, 3, 90),
    red: [...column("goblin", 700, 6, 75), { type: "healer", x: 860, y: 300, name: "Shaman Zog" }],
    redCode: RED_GANG,
    timeLimit: 60,
    stars: [win, survivors(3), fast(30)],
    hints: [
      {
        title: "Find the healer",
        text: "This line looks through all enemies and returns the first one that is a healer (or undefined if none).",
        code: `let healer = enemies.find(e => e.type == "healer")`,
      },
      {
        title: "Plan B with if / else",
        text: "If the healer exists, attack it. Otherwise attack the nearest enemy.",
        code: `let healer = enemies.find(e => e.type == "healer")\nif (healer) {\n  me.attack(healer)\n} else {\n  me.attack(me.nearestEnemy())\n}`,
      },
      {
        title: "Gang up!",
        text: "When all your knights hit the SAME enemy, it goes down really fast. me.weakestEnemy() is the same for everybody.",
      },
    ],
  },
  {
    id: "arrows",
    num: 3,
    title: "Arrows Away",
    tagline: "Archers keep their distance",
    color: "lime",
    story:
      "You've got ARCHERS now! But these goblins are sneaky: they rush straight for your archers. Archers shoot from far away… so maybe they shouldn't wait for goblins to bite them?",
    learn: "me.type tells what kind of fighter is running the code. me.distanceTo() + me.moveAwayFrom() let archers run away (\"kiting\").",
    blue: [...column("knight", 230, 2, 120), ...column("archer", 140, 2, 160)],
    red: column("goblin", 790, 6, 75),
    redCode: RED_ARCHER_HUNTERS,
    timeLimit: 75,
    stars: [win, survivors(3), flawless],
    hints: [
      {
        title: "Different jobs",
        text: "Use if to give different orders to each type of fighter.",
        code: `if (me.type == "archer") {\n  // archer stuff\n} else {\n  // knight stuff\n}`,
      },
      {
        title: "Run away!",
        text: "If an enemy gets too close, the archer runs away. Otherwise, shoot!",
        code: `let enemy = me.nearestEnemy()\nif (me.type == "archer" && me.distanceTo(enemy) < 80) {\n  me.moveAwayFrom(enemy)\n} else {\n  me.attack(enemy)\n}`,
      },
      {
        title: "Bodyguards",
        text: "Knights could protect the archers by attacking the goblin closest to an archer… can you figure out how?",
      },
    ],
  },
  {
    id: "healing",
    num: 4,
    title: "Healing Light",
    tagline: "Keep your team alive",
    color: "yellow",
    story:
      "A real red squad approaches: knights AND archers. Luckily, a Healer joined your team. A healer is a terrible fighter… but a fantastic friend.",
    learn: "me.weakestAlly() finds the most hurt friend. me.heal() fixes them up. Only healers can heal!",
    blue: [...column("knight", 230, 3, 90), { type: "healer", x: 130, y: 300 }],
    red: [...column("knight", 720, 2, 120), ...column("archer", 830, 2, 140)],
    redCode: RED_SQUAD,
    timeLimit: 80,
    stars: [win, survivors(3), flawless],
    hints: [
      {
        title: "Healer's job",
        text: "Let the healer heal the weakest friend.",
        code: `if (me.type == "healer") {\n  let friend = me.weakestAlly()\n  me.heal(friend)\n}`,
      },
      {
        title: "Don't forget the others",
        text: "Your knights still need orders! Put the knight code in an else block.",
        code: `if (me.type == "healer") {\n  me.heal(me.weakestAlly())\n} else {\n  me.attack(me.nearestEnemy())\n}`,
      },
      {
        title: "Target the archers",
        text: "The red archers are fragile but deadly. Taking them out first might save your team...",
      },
    ],
  },
  {
    id: "potions",
    num: 5,
    title: "Treasure Hunt",
    tagline: "Grab the power-ups",
    color: "orange",
    story:
      "Magic treasures appear in the middle of the arena! 🧪 Potions heal, 💎 Rage Gems double damage, 🔵 Shield Orbs block hits. The red knights are greedy. Will you let them grab everything?",
    learn: "The items list holds every treasure. me.nearestItem() finds the closest one, and me.moveTo() walks there to pick it up.",
    blue: column("knight", 180, 4, 85),
    red: column("knight", 780, 4, 85),
    items: [
      { kind: "rage", x: 480, y: 300, at: 0 },
      { kind: "shield", x: 400, y: 160, at: 0 },
      { kind: "shield", x: 400, y: 440, at: 0 },
      { kind: "potion", x: 560, y: 160, at: 4 },
      { kind: "potion", x: 560, y: 440, at: 4 },
      { kind: "rage", x: 480, y: 120, at: 9 },
      { kind: "rage", x: 480, y: 480, at: 9 },
      { kind: "potion", x: 300, y: 300, at: 14 },
      { kind: "potion", x: 660, y: 300, at: 14 },
    ],
    redCode: RED_ITEM_GRABBERS,
    timeLimit: 80,
    stars: [win, survivors(3), survivors(4)],
    hints: [
      {
        title: "Go get it",
        text: "Walk to the nearest treasure if there is one.",
        code: `let item = me.nearestItem()\nif (item) {\n  me.moveTo(item)\n} else {\n  me.attack(me.nearestEnemy())\n}`,
      },
      {
        title: "Only if it's close",
        text: "Running across the whole arena is risky. Only grab treasures that are close!",
        code: `let item = me.nearestItem()\nif (item && me.distanceTo(item) < 200) {\n  me.moveTo(item)\n}`,
      },
      {
        title: "Order matters",
        text: "When your code gives two orders, the LAST one wins. So put the most important order at the end, or use else.",
      },
    ],
  },
  {
    id: "specials",
    num: 6,
    title: "Special Moves",
    tagline: "Every fighter has a secret power",
    color: "grape",
    story:
      "A HUGE swarm of goblins! Too many to fight one by one. Good thing every fighter has a special move: Knights spin in a Whirlwind, Archers fire a Power Shot that goes through everyone!",
    learn: "me.specialReady is true when the special move is charged. me.special() uses it, then it needs a few seconds to recharge.",
    blue: [...column("knight", 240, 3, 100), ...column("archer", 140, 2, 150)],
    red: [...column("goblin", 700, 6, 70), ...column("goblin", 770, 6, 70), ...column("goblin", 840, 4, 80)],
    redCode: RED_HORDE,
    timeLimit: 90,
    stars: [win, survivors(3), survivors(4)],
    hints: [
      {
        title: "Use it when it's ready",
        text: "Put this before your attack line.",
        code: `if (me.specialReady) {\n  me.special(me.nearestEnemy())\n}`,
      },
      {
        title: "Wait for the perfect moment",
        text: "A Whirlwind is best when MANY enemies are close. me.enemiesNear(70) gives a list of enemies close to you. .length tells how many!",
        code: `if (me.type == "knight" && me.specialReady && me.enemiesNear(70).length >= 3) {\n  me.special()\n}`,
      },
      {
        title: "Line them up",
        text: "Power Shot flies in a straight line through every goblin. Aim it at a far away enemy so it pierces the whole crowd!",
      },
    ],
  },
  {
    id: "fire",
    num: 7,
    title: "Fire & Fury",
    tagline: "Mages burn crowds",
    color: "red",
    story:
      "Two Mages joined your army! Their fireballs burn everyone around the target, and their Meteor special can wipe out a whole crowd. The goblins brought shamans though…",
    learn: "Area attacks are best where enemies are bunched together. me.special(x, y) can also aim at a place!",
    blue: [...column("knight", 240, 2, 140), ...column("mage", 140, 2, 120)],
    red: [
      ...column("goblin", 680, 5, 80),
      ...column("goblin", 750, 5, 80),
      ...column("goblin", 820, 2, 160),
      ...column("healer", 870, 2, 120),
    ],
    redCode: RED_HORDE,
    timeLimit: 90,
    stars: [win, survivors(3), survivors(4)],
    hints: [
      {
        title: "Meteor time",
        text: "Drop a meteor on the nearest enemy when it's ready.",
        code: `if (me.type == "mage" && me.specialReady) {\n  me.special(me.nearestEnemy())\n}`,
      },
      {
        title: "Find the crowd",
        text: "Look for the enemy with the most friends around it, and aim there!",
        code: `let best = null\nlet most = 0\nfor (let e of enemies) {\n  let crowd = enemies.filter(o => distance(o, e) < 80).length\n  if (crowd > most) {\n    most = crowd\n    best = e\n  }\n}`,
      },
      {
        title: "Mages are fragile",
        text: "Like archers, mages should run away when goblins get too close.",
      },
    ],
  },
  {
    id: "ogre",
    num: 8,
    title: "The Ogre King",
    tagline: "A boss battle!",
    color: "violet",
    story:
      "First defeat the goblin guards… then the OGRE KING himself stomps into the arena. 1100 health. His STOMP hurts everyone around him. Stay away when he's ready to stomp!",
    learn: "You can check an enemy's specialReady too, to dodge their special move. Teamwork and kiting win boss fights.",
    blue: [
      ...column("knight", 250, 2, 140),
      ...column("archer", 160, 2, 200),
      { type: "healer", x: 110, y: 300 },
    ],
    red: column("goblin", 760, 6, 75),
    waves: [[{ type: "ogre", x: 820, y: 300, name: "Ogre King" }, ...column("goblin", 870, 2, 200)]],
    items: [
      { kind: "potion", x: 480, y: 120, at: 15 },
      { kind: "potion", x: 480, y: 480, at: 15 },
      { kind: "rage", x: 300, y: 300, at: 22 },
    ],
    redCode: RED_OGRE,
    timeLimit: 120,
    stars: [win, survivors(3), survivors(4)],
    hints: [
      {
        title: "Spot the boss",
        text: "Find the ogre and remember it in a variable.",
        code: `let boss = enemies.find(e => e.type == "ogre")`,
      },
      {
        title: "Dodge the stomp",
        text: "If the boss can stomp and you're close, back off! Otherwise, attack.",
        code: `let boss = enemies.find(e => e.type == "ogre")\nif (boss && boss.specialReady && me.distanceTo(boss) < 140) {\n  me.moveAwayFrom(boss)\n} else {\n  me.attack(me.nearestEnemy())\n}`,
      },
      {
        title: "Archers win this",
        text: "The ogre is slow. Archers that keep running away while shooting can beat him almost alone!",
      },
    ],
  },
  {
    id: "royale",
    num: 9,
    title: "Code Royale",
    tagline: "Face the Red Champion",
    color: "pink",
    story:
      "The final duel! The Red Champion commands the exact same army as you, and their code is VERY clever: they focus weak targets, kite, heal and use specials. Only the best commander wins the crown. 👑",
    learn: "Everything you learned, together. Peek at the champion's code after a defeat to learn their tricks!",
    blue: [
      ...column("knight", 250, 2, 160),
      ...column("archer", 170, 2, 100),
      { type: "healer", x: 110, y: 200 },
      { type: "mage", x: 110, y: 400 },
    ],
    red: [
      ...column("knight", 710, 2, 160),
      ...column("archer", 790, 2, 100),
      { type: "healer", x: 850, y: 200 },
      { type: "mage", x: 850, y: 400 },
    ],
    items: [
      { kind: "rage", x: 480, y: 300, at: 6 },
      { kind: "potion", x: 480, y: 110, at: 15 },
      { kind: "potion", x: 480, y: 490, at: 15 },
      { kind: "shield", x: 480, y: 300, at: 25 },
    ],
    redCode: RED_CHAMPION,
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
        code: `if (!team.target || !enemies.find(e => e.id == team.target.id)) {\n  team.target = me.weakestEnemy()\n}\nlet target = enemies.find(e => e.id == team.target.id)`,
      },
      {
        title: "Protect the healer",
        text: "Their healer undoes all your damage, and yours undoes theirs. Who should you take out first?",
      },
    ],
  },
  {
    id: "endless",
    num: 10,
    title: "Endless Horde",
    tagline: "How long can you survive?",
    color: "indigo",
    story:
      "Wave after wave after wave. Each one is bigger than the last, and an ogre shows up every 7 waves. Between waves your fighters patch themselves up a little. How far can your code go?",
    learn: "No new tricks: this is where your best code shines. Beat your own record!",
    blue: [
      ...column("knight", 250, 2, 160),
      ...column("archer", 170, 2, 100),
      { type: "healer", x: 110, y: 200 },
      { type: "mage", x: 110, y: 400 },
    ],
    red: column("goblin", 780, 3, 100),
    endless: true,
    redCode: RED_ENDLESS,
    timeLimit: 900,
    stars: [
      { label: "Clear 5 waves", test: (r) => r.wave >= 5 },
      { label: "Clear 8 waves", test: (r) => r.wave >= 8 },
      { label: "Clear 12 waves", test: (r) => r.wave >= 12 },
    ],
    hints: [
      {
        title: "Survive, then fight",
        text: "Hurt fighters can step back behind the knights so the healer can fix them up.",
        code: `if (me.health < me.maxHealth * 0.3 && me.type != "knight") {\n  me.moveTo(80, arena.centerY)\n  return\n}`,
      },
      {
        title: "return",
        text: "return stops your code for this fighter right away. It's a handy way to say \"I'm done deciding!\"",
      },
    ],
  },
];

export function levelById(id: string): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

export function starsFor(level: Level, r: BattleResult): boolean[] {
  return level.stars.map((s) => s.test(r));
}
