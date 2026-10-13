// Simulates every level with a few reference strategies to check the difficulty curve.
// Headless: engine + content only, no browser. Usage: npm run balance [levelId]
import { contentFor, starsFor, toBattleSetup } from "@code-royale/content";
import { runBattle } from "@code-royale/engine";

const { levels, strategies } = contentFor("en");

const STRATEGIES: Record<string, string> = {
  // What a kid gets at the start.
  naive: strategies.starter.code,
  // The lessons of levels 2–4: move as a group behind a leader/scout, archers escape.
  group: `
let enemy = me.nearestEnemy()
let scout = allies.find(a => a.type == "scout")
let leader = scout || allies.find(a => a.index == 0)
if (enemy) {
  if ((me.type == "archer" || me.type == "mage" || me.type == "scout") && me.distanceTo(enemy) < 90) me.escape()
  else me.attack(enemy)
} else if (me.type == "scout" || !leader) {
  me.explore()
} else {
  me.follow(leader, scout ? 140 : 50)
}
`,
  // Everything a kid could know by the end of the campaign.
  pro: `
let near = me.nearestEnemy()
let scout = allies.find(a => a.type == "scout")
let leader = scout || allies.find(a => a.index == 0)
if (!near) {
  let item = me.nearestItem()
  if (item && me.distanceTo(item) < 200) { me.moveTo(item); return }
  if (me.type == "scout" || !leader) me.explore()
  else me.follow(leader, scout ? 140 : 50)
  return
}
let boss = enemies.find(e => e.type == "ogre")
if (boss && boss.specialReady && me.distanceTo(boss) < 150) { me.moveAwayFrom(boss); return }
let item = me.nearestItem()
if (item && me.distanceTo(item) < 120) { me.moveTo(item); return }
let target = me.weakestEnemy()
if (me.distanceTo(target) > 250) target = near
if (me.type == "scout") {
  if (me.isSpotted && me.health < 40 && me.specialReady) me.special()
  if (me.distanceTo(near) < 120) me.escape(); else me.attack(near)
  return
}
if (me.type == "archer" || me.type == "mage") {
  if (me.specialReady) {
    let best = near, most = 0
    for (let e of enemies) { let c = enemies.filter(o => distance(o, e) < 80).length; if (c > most) { most = c; best = e } }
    me.special(me.type == "mage" ? best : target)
  }
  if (me.distanceTo(near) < 100) { me.escape(); return }
  me.attack(target); return
}
if (me.specialReady && me.enemiesNear(70).length >= 2) me.special()
me.attack(target)
`,
  // The level 8 lesson: wait in the bushes, strike first.
  ambush: `
let enemy = me.nearestEnemy()
if (!enemy) { me.hide(); return }
if (me.type == "knight" && me.distanceTo(enemy) > 100) { me.hide(); return }
if ((me.type == "archer" || me.type == "mage") && me.distanceTo(enemy) < 80) { me.escape(); return }
if (me.specialReady) me.special(enemy)
me.attack(enemy)
`,
  // Level 4 hints 1 + 2 pasted together.
  scouthint: `
let scout = allies.find(a => a.type == "scout")
let enemy = me.nearestEnemy()
if (me.type == "scout") {
  if (enemy) me.circle(enemy, 200)
  else me.explore()
} else if (enemy && (me.type == "archer" || me.distanceTo(enemy) < 120)) {
  me.attack(enemy)
} else if (scout) {
  me.follow(scout, 150)
} else {
  me.explore()
}
`,
  champion: strategies.champion.code,
};

const only = process.argv[2];
for (const level of levels) {
  if (only && level.id !== only) continue;
  console.log(`\n=== ${level.num}. ${level.title}`);
  for (const [name, code] of Object.entries(STRATEGIES)) {
    const rows: string[] = [];
    for (const seed of [1, 2, 3]) {
      const { result, compileError } = runBattle(toBattleSetup(level, code, seed));
      if (compileError) {
        rows.push(`compile error ${JSON.stringify(compileError.message)}`);
        continue;
      }
      const r = result!;
      const stars = starsFor(level, r).filter(Boolean).length;
      rows.push(`${r.winner.padEnd(4)} ${"★".repeat(stars).padEnd(3)} ${r.blueAlive}/${r.blueTotal} red ${r.redAlive} ${r.time}s${level.endless || level.waves ? ` w${r.wave}` : ""}`);
    }
    console.log(`  ${name.padEnd(9)} ${rows.join(" | ")}`);
  }
}
