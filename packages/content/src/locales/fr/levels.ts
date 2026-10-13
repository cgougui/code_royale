import type { LevelId, LevelText } from "../../types";

export const levels: Record<LevelId, LevelText> = {
  training: {
    title: "Terrain d'entraînement",
    tagline: "Trouve-les, puis combats-les",
    story: "Trois chevaliers rouges font la sieste dans différents coins du terrain d'entraînement. Tes chevaliers ne repèrent les ennemis qu'à l'intérieur de leur rayon de détection (le cercle lumineux autour d'eux). Lis le code à gauche, puis appuie sur COMBAT !",
    learn: "me.nearestEnemy() ne trouve que les ennemis que ton équipe VOIT. Si personne n'est en vue, il renvoie null : utilise donc if / else pour attaquer quand tu vois quelqu'un, et explorer sinon.",
    hints: [
      {
        title: "Pousse un cri !",
        text: "Les combattants savent parler. Ajoute cette ligne à la fin et regarde l'arène :",
        code: `me.say("Pour le Royaume Bleu !")`,
      },
      {
        title: "Essaie sans explore",
        text: "Supprime la partie else et appuie sur COMBAT. Tes chevaliers restent plantés là : ils ne voient personne ! Voilà pourquoi on explore.",
      },
    ],
  },
  together: {
    title: "Restez groupés",
    tagline: "Ne tombe pas seul dans une embuscade",
    story: "Les chevaliers rouges se déplacent en MEUTE. Si tes chevaliers explorent chacun de leur côté, la meute les attrape un par un ! Une équipe maligne se déplace ensemble, et attaque le même ennemi à plusieurs.",
    learn: "me.index est le numéro de ton combattant (0, 1, 2…). Laisse le combattant 0 ouvrir la marche et dis aux autres de suivre le chef avec me.follow().",
    hints: [
      {
        title: "Qui est le chef ?",
        text: "allies est la liste de tes autres combattants. Celui dont l'index vaut 0 peut être le chef.",
        code: `let leader = allies.find(a => a.index == 0)`,
      },
      {
        title: "Suis le chef",
        text: "Le chef explore, les autres le suivent. Tout le monde attaque dès qu'il voit un ennemi.",
        code: `let enemy = me.nearestEnemy()
let leader = allies.find(a => a.index == 0)
if (enemy) {
  me.attack(enemy)
} else if (leader) {
  me.follow(leader)
} else {
  me.explore()
}`,
      },
      {
        title: "Tous ensemble !",
        text: "Quand tous tes chevaliers frappent le MÊME ennemi, il tombe vite. Essaie me.weakestEnemy() à la place de me.nearestEnemy().",
      },
    ],
  },
  arrows: {
    title: "Pluie de flèches",
    tagline: "Tire, puis cours",
    story: "Tu as des ARCHERS maintenant ! Ils voient loin et tirent loin, mais ils sont fragiles. Les chevaliers rouges sont rusés : ils foncent droit sur tes archers. Et si tes archers n'attendaient pas de se faire frapper ?",
    learn: "me.type indique quel genre de combattant exécute le code. me.distanceTo() mesure à quelle distance se trouve un danger, et me.escape() fuit tous les ennemis que tu vois.",
    hints: [
      {
        title: "Chacun son métier",
        text: "Utilise if pour donner des ordres différents à chaque type de combattant.",
        code: `if (me.type == "archer") {
  // ce que fait l'archer
} else {
  // ce que fait le chevalier
}`,
      },
      {
        title: "Trop près ? Cours !",
        text: "Un archer qui voit un ennemi trop près s'enfuit. Sinon, il tire !",
        code: `let enemy = me.nearestEnemy()
if (!enemy) {
  me.explore()
} else if (me.type == "archer" && me.distanceTo(enemy) < 90) {
  me.escape()
} else {
  me.attack(enemy)
}`,
      },
      {
        title: "Gardes du corps",
        text: "Les chevaliers pourraient rester près des archers avec me.follow(...) : comme ça, les ennemis tombent d'abord sur les chevaliers !",
      },
    ],
  },
  scout: {
    title: "Éclaireur en tête",
    tagline: "Les yeux avant les épées",
    story: "L'armée rouge se cache dans une forêt pleine de buissons, prête à te tendre une embuscade. Voici ton ÉCLAIREUR 🔭 : super rapide, le plus grand rayon de détection, et des yeux perçants qui repèrent de loin les ennemis cachés dans les buissons. Ce qu'un combattant voit, toute l'équipe le voit !",
    learn: "La vision est partagée : quand l'éclaireur repère un ennemi, celui-ci apparaît dans la liste enemies de tout le monde. Envoie l'éclaireur en premier, et garde les autres à bonne distance derrière.",
    hints: [
      {
        title: "L'éclaireur d'abord",
        text: "Seul l'éclaireur explore. Tous les autres le suivent à bonne distance, et combattent ce que l'équipe voit.",
        code: `let scout = allies.find(a => a.type == "scout")
let enemy = me.nearestEnemy()
if (me.type == "scout") {
  me.explore()
} else if (enemy) {
  me.attack(enemy)
} else if (scout) {
  me.follow(scout, 150)
}`,
      },
      {
        title: "Trouvés ? Surveille-les de loin !",
        text: "Quand l'éclaireur repère des ennemis, il ne doit pas foncer dessus. me.circle(enemy, 200) le fait tourner autour d'eux : assez loin pour rester en sécurité, assez près pour continuer à les surveiller.",
        code: `if (me.type == "scout") {
  if (enemy) me.circle(enemy, 200)   // garde un œil sur eux
  else me.explore()
}`,
      },
      {
        title: "Déjoue l'embuscade",
        text: "Les combattants rouges ne sortent de leur buisson que si tu t'approches. Alors laisse les archers tirer sur tout ce que voit l'éclaireur, et garde les chevaliers en arrière tant que les ennemis ne sont pas sortis :",
        code: `if (enemy && (me.type == "archer" || me.distanceTo(enemy) < 120)) {
  me.attack(enemy)
}`,
      },
    ],
  },
  potions: {
    title: "Chasse au trésor",
    tagline: "Ramasse les bonus",
    story: "Des trésors magiques apparaissent dans l'arène ! 🧪 Les potions soignent, 💎 les Gemmes de rage doublent les dégâts, 🔵 les Orbes bouclier bloquent les coups. Les chevaliers rouges sont gourmands. Vas-tu les laisser tout ramasser ?",
    learn: "La liste items contient tous les trésors (tu vois toujours les trésors). me.nearestItem() trouve le plus proche, et me.moveTo() marche jusqu'à lui pour le ramasser.",
    hints: [
      {
        title: "Va le chercher",
        text: "Marche jusqu'au trésor le plus proche, s'il y en a un.",
        code: `let item = me.nearestItem()
let enemy = me.nearestEnemy()
if (item) {
  me.moveTo(item)
} else if (enemy) {
  me.attack(enemy)
} else {
  me.explore()
}`,
      },
      {
        title: "Seulement s'il est proche",
        text: "Traverser toute l'arène, c'est risqué. Ne ramasse que les trésors proches !",
        code: `if (item && me.distanceTo(item) < 200) {
  me.moveTo(item)
}`,
      },
      {
        title: "L'ordre compte",
        text: "Quand ton code donne deux ordres, c'est le DERNIER qui gagne. Mets donc l'ordre le plus important à la fin, ou utilise else.",
      },
    ],
  },
  specials: {
    title: "Coups spéciaux",
    tagline: "Chaque combattant a un pouvoir secret",
    story: "L'armée rouge marche sur ton camp, tous ensemble. Dans un combat à armes égales, qui gagne ? Celui qui utilise ses coups spéciaux ! Chaque combattant en a un : les chevaliers tournent en Tourbillon, les archers décochent un Tir puissant qui traverse tout le monde, et les éclaireurs disparaissent dans une Bombe fumigène.",
    learn: "me.specialReady vaut true quand le coup spécial est chargé (une ⭐ clignote à côté de la barre de vie). me.special() l'utilise, puis il lui faut quelques secondes pour se recharger.",
    hints: [
      {
        title: "Utilise-le dès qu'il est prêt",
        text: "Mets ceci avant ta ligne d'attaque.",
        code: `if (me.specialReady && enemy) {
  me.special(enemy)
}`,
      },
      {
        title: "Attends le moment parfait",
        text: "Un Tourbillon est idéal quand BEAUCOUP d'ennemis sont proches. me.enemiesNear(70) donne la liste des ennemis près de toi. .length dit combien il y en a !",
        code: `if (me.type == "knight" && me.specialReady && me.enemiesNear(70).length >= 3) {
  me.special()
}`,
      },
      {
        title: "Tenez la position",
        text: "L'armée rouge vient vers TOI. Au lieu d'explorer, pourquoi ne pas attendre avec me.wait() à un bon endroit jusqu'à ce qu'elle arrive ?",
      },
    ],
  },
  fire: {
    title: "Feu et fureur",
    tagline: "Les mages brûlent les foules",
    story: "Des mages ! Leurs boules de feu brûlent tout le monde autour de la cible, et leur coup spécial Météore peut balayer toute une foule. L'armée rouge marche en groupe serré… parfait pour un météore !",
    learn: "Les attaques de zone sont les plus efficaces là où les ennemis sont regroupés. me.special(x, y) peut aussi viser un endroit !",
    hints: [
      {
        title: "L'heure du météore",
        text: "Lâche un météore sur l'ennemi le plus proche dès qu'il est prêt.",
        code: `if (me.type == "mage" && me.specialReady && enemy) {
  me.special(enemy)
}`,
      },
      {
        title: "Trouve la foule",
        text: "Cherche l'ennemi qui a le plus d'amis autour de lui, et vise-le !",
        code: `let best = null
let most = 0
for (let e of enemies) {
  let crowd = enemies.filter(o => distance(o, e) < 80).length
  if (crowd > most) {
    most = crowd
    best = e
  }
}`,
      },
      {
        title: "Les mages sont fragiles",
        text: "Comme les archers, les mages devraient fuir avec me.escape() quand des chevaliers s'approchent trop.",
      },
    ],
  },
  ambush: {
    title: "Embuscade !",
    tagline: "Cette fois, c'est TOI qui te caches",
    story: "L'armée rouge marche sur ton camp. La même armée que la tienne… alors ne te bats pas à la loyale ! Cache-toi dans les buissons, laisse-les tomber dans ton piège, et frappe le premier. Attention : attaquer depuis un buisson révèle ta position pendant un instant.",
    learn: "me.hide() marche jusqu'au buisson le plus proche. me.isHidden indique si tu es caché en ce moment. Les ennemis ne repèrent les combattants cachés que de très près.",
    hints: [
      {
        title: "À l'affût",
        text: "Reste caché jusqu'à ce qu'un ennemi apparaisse, puis attaque.",
        code: `let enemy = me.nearestEnemy()
if (enemy) {
  me.attack(enemy)
} else {
  me.hide()
}`,
      },
      {
        title: "Frappe quand ils sont tout près",
        text: "Les archers tirent de loin. Les chevaliers, eux, devraient rester cachés jusqu'à ce que l'ennemi soit VRAIMENT proche, pour le surprendre.",
        code: `if (me.type == "knight" && enemy && me.distanceTo(enemy) > 100) {
  me.hide()
}`,
      },
      {
        title: "Repéré ? Change de buisson !",
        text: "Si me.isSpotted vaut true, l'ennemi sait où tu es. Les archers pourraient s'enfuir et revenir plus tard !",
      },
    ],
  },
  ogre: {
    title: "Le Roi Ogre",
    tagline: "Un combat de boss !",
    story: "Bats d'abord les gardes gobelins… puis le ROI OGRE en personne débarque dans l'arène. 900 points de vie. Son PIÉTINEMENT blesse tout le monde autour de lui. Éloigne-toi quand il s'apprête à piétiner, et sers-toi des rochers pour le tenir loin de tes archers !",
    learn: "Tu peux aussi regarder le specialReady d'un ennemi, pour esquiver son coup spécial. Les rochers bloquent le passage ET la vue : cache-toi derrière l'un d'eux pour qu'on ne te voie plus.",
    note: "👹 Combat de boss : l'armée rouge est différente exprès. Quelques gobelins, puis un ogre géant contre toute ton équipe.",
    names: { ogreKing: "Roi Ogre" },
    hints: [
      {
        title: "Repère le boss",
        text: "Trouve l'ogre et garde-le dans une variable (elle vaut undefined tant que personne ne l'a vu).",
        code: `let boss = enemies.find(e => e.type == "ogre")`,
      },
      {
        title: "Esquive le piétinement",
        text: "Si le boss peut piétiner et que tu es proche, recule ! Sinon, attaque.",
        code: `let boss = enemies.find(e => e.type == "ogre")
if (boss && boss.specialReady && me.distanceTo(boss) < 140) {
  me.moveAwayFrom(boss)
} else if (enemy) {
  me.attack(enemy)
}`,
      },
      {
        title: "Les archers peuvent gagner",
        text: "L'ogre est lent. Des archers qui reculent sans arrêt tout en tirant peuvent le battre presque seuls !",
      },
    ],
  },
  royale: {
    title: "Code Royale",
    tagline: "Affronte le Champion Rouge",
    story: "Le duel final ! Le Champion Rouge commande exactement la même armée que toi, et son code est TRÈS malin : il explore, suit, cible les plus faibles, fuit quand il est blessé et utilise ses coups spéciaux. Seul le meilleur commandant gagnera la couronne. 👑",
    learn: "Tout ce que tu as appris, réuni. Après une défaite, jette un œil au code du champion pour découvrir ses astuces !",
    hints: [
      {
        title: "Connais ton ennemi",
        text: "Perds une fois, puis appuie sur « Espionner le code rouge » pour lire le code du champion. Ensuite, bats-le !",
      },
      {
        title: "Mémoire d'équipe",
        text: "team est un objet partagé par tous tes combattants. Un combattant peut choisir une cible, et tout le monde le suit !",
        code: `if (!team.target || !enemies.find(e => e.id == team.target.id)) {
  team.target = me.weakestEnemy()
}
let target = team.target && enemies.find(e => e.id == team.target.id)`,
      },
      {
        title: "Frappe depuis l'ombre",
        text: "Les buissons dans les coins et au milieu sont parfaits pour une embuscade…",
      },
    ],
  },
  endless: {
    title: "Horde sans fin",
    tagline: "Combien de temps tiendras-tu ?",
    story: "Vague après vague après vague. Chacune est plus grosse que la précédente, et un ogre débarque toutes les 7 vagues. Entre deux vagues, tes combattants se soignent un peu. Jusqu'où ton code peut-il aller ?",
    learn: "Pas de nouvelle astuce : c'est ici que ton meilleur code brille. Bats ton propre record !",
    note: "🌊 Mode survie : des combattants rouges, vague après vague. Les vagues ne sont pas comme ton armée ; elles deviennent juste de plus en plus grosses.",
    hints: [
      {
        title: "Survis, puis combats",
        text: "Les combattants blessés peuvent reculer derrière les chevaliers, ou se cacher dans un buisson le temps que ça se calme.",
        code: `if (me.health < me.maxHealth * 0.3 && me.type != "knight") {
  me.hide()
  return
}`,
      },
      {
        title: "return",
        text: "return arrête tout de suite ton code pour ce combattant. C'est pratique pour dire « J'ai fini de décider ! »",
      },
    ],
  },
};
