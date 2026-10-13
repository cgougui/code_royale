import type { Strategy } from "../types";

export const forestAmbush: Strategy = {
  id: "forest-ambush",
  name: "Forest Ambush",
  team: "red",
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
};
