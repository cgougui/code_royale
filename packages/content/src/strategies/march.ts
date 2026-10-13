import type { Strategy } from "../types";

export const march: Strategy = {
  id: "march",
  name: "The March",
  team: "red",
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
};
