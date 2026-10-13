import type { StrategyId, StrategyText } from "../../types";

export const strategies: Record<StrategyId, StrategyText> = {
  "archer-hunters": {
    name: "Archer Hunters",
    code: `// Red knights go straight for your archers!
// (But red archers never run away.)
let archer = enemies.find(e => e.type == "archer")
let enemy = me.nearestEnemy()
if (me.type == "knight" && archer) {
  me.attack(archer)
} else if (enemy) {
  me.attack(enemy)
} else {
  me.explore()
}
`,
  },
  champion: {
    name: "The Red Champion",
    code: `// The Red Champion's code. Very clever!
let near = me.nearestEnemy()
let weak = me.weakestEnemy()

// Nobody in sight: the scout searches, everybody else follows it.
if (!near) {
  let scout = allies.find(a => a.type == "scout")
  if (me.type == "scout" || !scout) me.explore()
  else me.follow(scout, 120)
  return
}

// Badly hurt and spotted? Run! Grab a potion if one is close.
if (me.health < me.maxHealth * 0.3 && me.isSpotted) {
  if (me.type == "scout" && me.specialReady) me.special()
  let potion = me.nearestItem("potion")
  if (potion && me.distanceTo(potion) < 200) me.moveTo(potion)
  else me.escape()
  return
}

if (me.type == "archer" || me.type == "mage") {
  if (me.specialReady) me.special(weak)
  if (me.distanceTo(near) < 90) me.escape()
  else me.attack(weak)
  return
}

if (me.type == "scout") {
  // Keep the enemy in sight, but stay out of reach.
  if (me.distanceTo(near) < 120) me.moveAwayFrom(near)
  else me.attack(near)
  return
}

if (me.type == "knight" && me.specialReady && me.enemiesNear(80).length >= 2) me.special()
if (me.distanceTo(weak) < 220) me.attack(weak)
else me.attack(near)
`,
  },
  "endless-horde": {
    name: "The Endless Horde",
    code: `// The endless horde.
let near = me.nearestEnemy()
if (!near) {
  if (me.x > 300) me.moveTo(120, me.y)
  else me.explore()
  return
}
if ((me.type == "archer" || me.type == "mage") && me.distanceTo(near) < 70) {
  me.escape()
  return
}
if (me.specialReady && me.enemiesNear(110).length > 0) me.special(near)
me.attack(near)
`,
  },
  "forest-ambush": {
    name: "Forest Ambush",
    code: `// The forest ambush: everybody hides in a bush.
// Archers shoot from their bush, the others jump out when you come close.
let enemy = me.nearestEnemy()
let reach = me.type == "archer" ? 200 : 140
if (enemy && me.distanceTo(enemy) < reach) {
  me.attack(enemy)
} else {
  me.hide()
}
`,
  },
  march: {
    name: "The March",
    code: `// The red army marches on your camp, all together.
// They never use their special moves!
let enemy = me.nearestEnemy()
let leader = allies.find(a => a.index == 0)
if (enemy) {
  me.attack(enemy)
} else if (leader) {
  me.follow(leader, 45)
} else if (me.x > 250) {
  me.moveTo(100, arena.centerY)
} else {
  me.explore()   // arrived and nobody here? search around!
}
`,
  },
  "ogre-king": {
    name: "The Ogre King",
    code: `// The Ogre King stomps anyone who gets close.
let enemy = me.nearestEnemy()
if (!enemy) {
  me.moveTo(100, me.y)
  return
}
if (me.type == "ogre") {
  if (me.specialReady && me.enemiesNear(120).length > 0) {
    me.special()
    me.say("STOMP!!")
  }
} else if (me.specialReady && me.distanceTo(enemy) < 60) {
  me.special()
}
me.attack(enemy)
`,
  },
  pack: {
    name: "The Pack",
    code: `// The red pack sticks together behind its leader...
// but everybody attacks a different enemy.
let enemy = me.nearestEnemy()
let leader = allies.find(a => a.index == 0)
if (enemy) {
  me.attack(enemy)
} else if (leader) {
  me.follow(leader, 50)
} else {
  me.explore()
}
`,
  },
  sleepy: {
    name: "Sleepy Squad",
    code: `// The red knights are sleepy: they wait at their camp
// and only fight when an enemy comes close.
let enemy = me.nearestEnemy()
if (enemy && me.distanceTo(enemy) < 100) {
  me.attack(enemy)
} else {
  me.wait()
}
`,
  },
  starter: {
    name: "Starter code",
    code: `// 👋 Welcome, Commander!
// This code runs for EACH of your blue fighters,
// 20 times every second. Change it, then press FIGHT!

let enemy = me.nearestEnemy()   // the closest enemy you can SEE

if (enemy) {
  me.attack(enemy)              // spotted one? Charge!
} else {
  me.explore()                  // nobody in sight? Go look around!
}
`,
  },
  "treasure-hunters": {
    name: "Treasure Hunters",
    code: `// These red knights LOVE treasure.
let item = me.nearestItem()
let enemy = me.nearestEnemy()
if (item && me.distanceTo(item) < 260) {
  me.moveTo(item)
} else if (enemy) {
  me.attack(enemy)
} else {
  me.explore()
}
`,
  },
};
