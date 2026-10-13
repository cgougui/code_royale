import type { StrategyId, StrategyText } from "../../types";

export const strategies: Record<StrategyId, StrategyText> = {
  "archer-hunters": {
    name: "Les Chasseurs d'archers",
    code: `// Les chevaliers rouges foncent droit sur tes archers !
// (Mais les archers rouges ne s'enfuient jamais.)
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
  },
  champion: {
    name: "Le Champion Rouge",
    code: `// Le code du Champion Rouge. Très malin !
let near = me.nearestEnemy()
let weak = me.weakestEnemy()

// Personne en vue : l'éclaireur cherche, tous les autres le suivent.
if (!near) {
  let scout = allies.find(a => a.type == "scout")
  if (me.type == "scout" || !scout) me.explore()
  else me.follow(scout, 120)
  return
}

// Gravement blessé et repéré ? Fuis ! Prends une potion si elle est proche.
if (me.health < me.maxHealth * 0.3 && me.isSpotted) {
  if (me.type == "scout" && me.specialReady) me.special()
  let potion = me.nearestItem("potion")
  if (potion && me.distanceTo(potion) < 200) me.moveTo(potion)
  else me.escape()
  return
}

if (me.type == "archer" || me.type == "mage") {
  if (me.specialReady) me.special(weak)
  if (me.distanceTo(near) < 90) me.escape()
  else me.attack(weak)
  return
}

if (me.type == "scout") {
  // Garde l'ennemi en vue, mais reste hors de portée.
  if (me.distanceTo(near) < 120) me.moveAwayFrom(near)
  else me.attack(near)
  return
}

if (me.type == "knight" && me.specialReady && me.enemiesNear(80).length >= 2) me.special()
if (me.distanceTo(weak) < 220) me.attack(weak)
else me.attack(near)
`,
  },
  "endless-horde": {
    name: "La Horde sans fin",
    code: `// La horde sans fin.
let near = me.nearestEnemy()
if (!near) {
  if (me.x > 300) me.moveTo(120, me.y)
  else me.explore()
  return
}
if ((me.type == "archer" || me.type == "mage") && me.distanceTo(near) < 70) {
  me.escape()
  return
}
if (me.specialReady && me.enemiesNear(110).length > 0) me.special(near)
me.attack(near)
`,
  },
  "forest-ambush": {
    name: "L'Embuscade de la forêt",
    code: `// L'embuscade de la forêt : tout le monde se cache dans un buisson.
// Les archers tirent depuis leur buisson, les autres surgissent quand tu t'approches.
let enemy = me.nearestEnemy()
let reach = me.type == "archer" ? 200 : 140
if (enemy && me.distanceTo(enemy) < reach) {
  me.attack(enemy)
} else {
  me.hide()
}
`,
  },
  march: {
    name: "La Marche",
    code: `// L'armée rouge marche sur ton camp, tous ensemble.
// Ils n'utilisent jamais leurs coups spéciaux !
let enemy = me.nearestEnemy()
let leader = allies.find(a => a.index == 0)
if (enemy) {
  me.attack(enemy)
} else if (leader) {
  me.follow(leader, 45)
} else if (me.x > 250) {
  me.moveTo(100, arena.centerY)
} else {
  me.explore()   // arrivés et personne ici ? cherchons autour !
}
`,
  },
  "ogre-king": {
    name: "Le Roi Ogre",
    code: `// Le Roi Ogre piétine tous ceux qui s'approchent.
let enemy = me.nearestEnemy()
if (!enemy) {
  me.moveTo(100, me.y)
  return
}
if (me.type == "ogre") {
  if (me.specialReady && me.enemiesNear(120).length > 0) {
    me.special()
    me.say("BOUM !!")
  }
} else if (me.specialReady && me.distanceTo(enemy) < 60) {
  me.special()
}
me.attack(enemy)
`,
  },
  pack: {
    name: "La Meute",
    code: `// La meute rouge reste groupée derrière son chef...
// mais chacun attaque un ennemi différent.
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
  },
  sleepy: {
    name: "L'Escouade endormie",
    code: `// Les chevaliers rouges ont sommeil : ils attendent dans leur camp
// et ne se battent que si un ennemi s'approche.
let enemy = me.nearestEnemy()
if (enemy && me.distanceTo(enemy) < 100) {
  me.attack(enemy)
} else {
  me.wait()
}
`,
  },
  starter: {
    name: "Code de départ",
    code: `// 👋 Bienvenue, Commandant !
// Ce code s'exécute pour CHACUN de tes combattants bleus,
// 20 fois par seconde. Modifie-le, puis appuie sur COMBAT !

let enemy = me.nearestEnemy()   // l'ennemi le plus proche que tu VOIS

if (enemy) {
  me.attack(enemy)              // repéré ? À l'attaque !
} else {
  me.explore()                  // personne en vue ? Va explorer !
}
`,
  },
  "treasure-hunters": {
    name: "Les Chasseurs de trésors",
    code: `// Ces chevaliers rouges ADORENT les trésors.
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
  },
};
