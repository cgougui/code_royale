import type { Strategy } from "../types";

export const endlessHorde: Strategy = {
  id: "endless-horde",
  name: "The Endless Horde",
  team: "red",
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
};
