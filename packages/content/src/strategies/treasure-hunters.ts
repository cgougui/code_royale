import type { Strategy } from "../types";

export const treasureHunters: Strategy = {
  id: "treasure-hunters",
  name: "Treasure Hunters",
  team: "red",
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
};
