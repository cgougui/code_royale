import type { Strategy } from "../types";

export const sleepy: Strategy = {
  id: "sleepy",
  name: "Sleepy Squad",
  team: "red",
  code: `// The red knights are sleepy: they wait at their camp
// and only fight when an enemy comes close.
let enemy = me.nearestEnemy()
if (enemy && me.distanceTo(enemy) < 100) {
  me.attack(enemy)
} else {
  me.wait()
}
`,
};
