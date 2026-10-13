import type { Strategy } from "../types";

export const pack: Strategy = {
  id: "pack",
  name: "The Pack",
  team: "red",
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
};
