import type { Strategy } from "../types";

export const archerHunters: Strategy = {
  id: "archer-hunters",
  name: "Archer Hunters",
  team: "red",
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
};
