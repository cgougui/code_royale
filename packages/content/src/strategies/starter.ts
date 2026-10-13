import type { Strategy } from "../types";

/** The code every player starts with: attack what you see, explore otherwise. */
export const starter: Strategy = {
  id: "starter",
  name: "Starter code",
  team: "blue",
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
};
