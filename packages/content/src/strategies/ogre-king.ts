import type { Strategy } from "../types";

export const ogreKing: Strategy = {
  id: "ogre-king",
  name: "The Ogre King",
  team: "red",
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
};
