import type { Strategy } from "../types";

export const champion: Strategy = {
  id: "champion",
  name: "The Red Champion",
  team: "red",
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
};
