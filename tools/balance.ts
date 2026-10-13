// Simulates every level with a few strategies to check the difficulty curve.
// Usage: npm run balance [levelId]
import { LEVELS, RED_CHAMPION, STARTER_CODE, starsFor } from "../app/game/levels";
import { runBattle } from "../app/game/sim";

const STRATEGIES: Record<string, string> = {
  naive: STARTER_CODE,
  weakest: `me.attack(me.weakestEnemy())`,
  kids: `
let enemy = me.nearestEnemy()
let healer = enemies.find(e => e.type == "healer")
if (healer && me.type == "knight") enemy = healer
if (me.type == "healer") { me.heal(me.weakestAlly()); return }
if ((me.type == "archer" || me.type == "mage") && me.distanceTo(enemy) < 80) { me.moveAwayFrom(enemy); return }
if (me.specialReady) me.special(enemy)
let item = me.nearestItem()
if (item && me.distanceTo(item) < 200) { me.moveTo(item); return }
me.attack(enemy)
`,
  champion: RED_CHAMPION,
  pro: `
let near = me.nearestEnemy()
if (!near) return
let boss = enemies.find(e => e.type == "ogre")
if (boss && boss.specialReady && me.distanceTo(boss) < 150) { me.moveAwayFrom(boss); return }
if (me.type == "healer") {
  let hurt = me.weakestAlly()
  if (me.specialReady && allies.filter(a => a.health < a.maxHealth * 0.6).length >= 2) me.special()
  if (me.health < me.maxHealth * 0.7) { me.heal(me); return }
  if (me.distanceTo(near) < 120) { me.moveAwayFrom(near); return }
  if (hurt && hurt.health < hurt.maxHealth) { me.heal(hurt); return }
  me.moveTo(120, arena.centerY); return
}
let target = me.weakestEnemy()
if (me.distanceTo(target) > 250) target = near
let healer = enemies.find(e => e.type == "healer")
if (healer && me.type != "knight") target = healer
if (me.type == "archer" || me.type == "mage") {
  if (me.specialReady) {
    let best = near, most = 0
    for (let e of enemies) { let c = enemies.filter(o => distance(o, e) < 80).length; if (c > most) { most = c; best = e } }
    me.special(me.type == "mage" ? best : target)
  }
  if (me.distanceTo(near) < 110) { me.moveAwayFrom(near); return }
  me.attack(target); return
}
if (me.specialReady && me.enemiesNear(70).length >= 2) me.special()
let item = me.nearestItem()
if (item && me.distanceTo(item) < 150) { me.moveTo(item); return }
let threat = enemies.find(e => allies.some(a => a.type != "knight" && distance(a, e) < 90))
me.attack(threat || near)
`,
};

const only = process.argv[2];
for (const level of LEVELS) {
  if (only && level.id !== only) continue;
  console.log(`\n=== ${level.num}. ${level.title}`);
  for (const [name, code] of Object.entries(STRATEGIES)) {
    const rows: string[] = [];
    for (const seed of [1, 2, 3]) {
      const t0 = performance.now();
      const { result, compileError } = runBattle({ ...level, blueCode: code, seed });
      if (compileError) {
        rows.push(`compile error ${compileError.message}`);
        continue;
      }
      const r = result!;
      const stars = starsFor(level, r).filter(Boolean).length;
      rows.push(
        `${r.winner.padEnd(4)} ${"★".repeat(stars).padEnd(3)} alive ${r.blueAlive}/${r.blueTotal} red ${r.redAlive} t=${r.time}s${level.endless || level.waves ? ` wave ${r.wave}` : ""} (${Math.round(performance.now() - t0)}ms)`,
      );
    }
    console.log(`  ${name.padEnd(9)} ${rows.join(" | ")}`);
  }
}
