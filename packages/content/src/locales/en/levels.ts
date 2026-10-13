import type { LevelId, LevelText } from "../../types";

export const levels: Record<LevelId, LevelText> = {
  training: {
    title: "Training Grounds",
    tagline: "Find them, then fight them",
    story: "Three red knights are dozing in different corners of the training field. Your knights can only spot enemies inside their detection radius (the bright circle around them). Read the code on the left, then press FIGHT!",
    learn: "me.nearestEnemy() only finds enemies your team can SEE. If nobody is in sight it gives null, so use if / else: attack when you see someone, explore when you don't.",
    hints: [
      {
        title: "Shout it out!",
        text: "Fighters can talk. Add this line at the end and watch the arena:",
        code: `me.say("For the Blue Kingdom!")`,
      },
      {
        title: "Try it without explore",
        text: "Delete the else part and press FIGHT. Your knights stand still: they can't see anybody! That's why we explore.",
      },
    ],
  },
  together: {
    title: "Stick Together",
    tagline: "Don't walk into an ambush alone",
    story: "The red knights move as a PACK. If your knights explore on their own, the pack catches them one by one! A smart team moves together, and gangs up on the same enemy.",
    learn: "me.index is your fighter's number (0, 1, 2…). Let fighter 0 lead the way and tell the others to me.follow() the leader.",
    hints: [
      {
        title: "Who's the leader?",
        text: "allies is the list of your other fighters. The one with index 0 can be the leader.",
        code: `let leader = allies.find(a => a.index == 0)`,
      },
      {
        title: "Follow the leader",
        text: "The leader explores, the others follow it. Everybody attacks when they see an enemy.",
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
        title: "Gang up!",
        text: "When all your knights hit the SAME enemy, it goes down fast. Try me.weakestEnemy() instead of me.nearestEnemy().",
      },
    ],
  },
  arrows: {
    title: "Arrows Away",
    tagline: "Hit, then run",
    story: "You've got ARCHERS now! They see far and shoot far, but they're fragile. The red knights are sneaky: they rush straight at your archers. Maybe archers shouldn't wait to get hit?",
    learn: "me.type tells what kind of fighter runs the code. me.distanceTo() measures how close a danger is, and me.escape() runs away from every enemy you can see.",
    hints: [
      {
        title: "Different jobs",
        text: "Use if to give different orders to each type of fighter.",
        code: `if (me.type == "archer") {
  // archer stuff
} else {
  // knight stuff
}`,
      },
      {
        title: "Too close? Run!",
        text: "An archer that sees an enemy too close runs away. Otherwise it shoots!",
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
        title: "Bodyguards",
        text: "Knights could stay next to the archers with me.follow(...) so goblins run into the knights first!",
      },
    ],
  },
  scout: {
    title: "Scout Ahead",
    tagline: "Eyes before swords",
    story: "The red army is hiding in a forest full of bushes, waiting to ambush you. Meet your SCOUT 🔭: super fast, the biggest detection radius, and sharp eyes that spot enemies in bushes from far away. Whatever one fighter sees, the whole team sees!",
    learn: "Vision is shared: when the scout spots an enemy, it appears in everybody's enemies list. Send the scout first, and keep the others a safe distance behind.",
    hints: [
      {
        title: "Scout first",
        text: "Only the scout explores. Everybody else follows the scout from a safe distance, and fights what the team sees.",
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
        title: "Found them? Watch from a safe distance!",
        text: "When the scout spots enemies, it shouldn't run into them. me.circle(enemy, 200) makes it walk in circles around them, far enough to stay safe, close enough to keep watching.",
        code: `if (me.type == "scout") {
  if (enemy) me.circle(enemy, 200)   // keep an eye on them
  else me.explore()
}`,
      },
      {
        title: "Snipe the ambush",
        text: "The red fighters only jump out of their bush when you come close. So let the archers shoot whatever the scout sees, and keep the knights back until goblins come out:",
        code: `if (enemy && (me.type == "archer" || me.distanceTo(enemy) < 120)) {
  me.attack(enemy)
}`,
      },
    ],
  },
  potions: {
    title: "Treasure Hunt",
    tagline: "Grab the power-ups",
    story: "Magic treasures appear in the arena! 🧪 Potions heal, 💎 Rage Gems double damage, 🔵 Shield Orbs block hits. The red knights are greedy. Will you let them grab everything?",
    learn: "The items list holds every treasure (you can always see treasures). me.nearestItem() finds the closest one, and me.moveTo() walks there to pick it up.",
    hints: [
      {
        title: "Go get it",
        text: "Walk to the nearest treasure if there is one.",
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
        title: "Only if it's close",
        text: "Running across the whole arena is risky. Only grab treasures that are close!",
        code: `if (item && me.distanceTo(item) < 200) {
  me.moveTo(item)
}`,
      },
      {
        title: "Order matters",
        text: "When your code gives two orders, the LAST one wins. So put the most important order at the end, or use else.",
      },
    ],
  },
  specials: {
    title: "Special Moves",
    tagline: "Every fighter has a secret power",
    story: "The red army marches on your camp, all together. In a fair fight, who wins? The one who uses special moves! Every fighter has one: Knights spin in a Whirlwind, Archers fire a Power Shot through everyone, and Scouts vanish in a Smoke Bomb.",
    learn: "me.specialReady is true when the special move is charged (a ⭐ blinks next to the health bar). me.special() uses it, then it needs a few seconds to recharge.",
    hints: [
      {
        title: "Use it when it's ready",
        text: "Put this before your attack line.",
        code: `if (me.specialReady && enemy) {
  me.special(enemy)
}`,
      },
      {
        title: "Wait for the perfect moment",
        text: "A Whirlwind is best when MANY enemies are close. me.enemiesNear(70) gives a list of enemies close to you. .length tells how many!",
        code: `if (me.type == "knight" && me.specialReady && me.enemiesNear(70).length >= 3) {
  me.special()
}`,
      },
      {
        title: "Hold the line",
        text: "The red army is coming to YOU. Instead of exploring, maybe me.wait() in a good spot until they arrive?",
      },
    ],
  },
  fire: {
    title: "Fire & Fury",
    tagline: "Mages burn crowds",
    story: "Mages! Their fireballs burn everyone around the target, and their Meteor special can wipe out a whole crowd. The red army walks in a tight bunch… perfect for a meteor!",
    learn: "Area attacks are best where enemies are bunched together. me.special(x, y) can also aim at a place!",
    hints: [
      {
        title: "Meteor time",
        text: "Drop a meteor on the nearest enemy when it's ready.",
        code: `if (me.type == "mage" && me.specialReady && enemy) {
  me.special(enemy)
}`,
      },
      {
        title: "Find the crowd",
        text: "Look for the enemy with the most friends around it, and aim there!",
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
        title: "Mages are fragile",
        text: "Like archers, mages should me.escape() when knights get too close.",
      },
    ],
  },
  ambush: {
    title: "Ambush!",
    tagline: "Now YOU hide in the bushes",
    story: "The red army is marching on your camp. Same army as yours… so don't fight fair! Hide in the bushes, let them walk into your trap, and strike first. Careful: attacking from a bush gives your position away for a moment.",
    learn: "me.hide() walks to the nearest bush. me.isHidden tells if you're hidden right now. Enemies only spot hidden fighters when they're very close.",
    hints: [
      {
        title: "Lie in wait",
        text: "Hide until an enemy shows up, then attack.",
        code: `let enemy = me.nearestEnemy()
if (enemy) {
  me.attack(enemy)
} else {
  me.hide()
}`,
      },
      {
        title: "Strike when they're close",
        text: "Archers have a long range. Knights should stay hidden until the enemy is REALLY close, so the enemy gets surprised.",
        code: `if (me.type == "knight" && enemy && me.distanceTo(enemy) > 100) {
  me.hide()
}`,
      },
      {
        title: "Spotted? Change bush!",
        text: "If me.isSpotted is true, the enemy knows where you are. Archers could escape and come back later!",
      },
    ],
  },
  ogre: {
    title: "The Ogre King",
    tagline: "A boss battle!",
    story: "First defeat the goblin guards… then the OGRE KING himself stomps into the arena. 900 health. His STOMP hurts everyone around him. Stay away when he's ready to stomp, and use the rocks to keep him off your archers!",
    learn: "You can check an enemy's specialReady too, to dodge their special move. Rocks block the way AND block sight: hide behind one to break line of sight.",
    note: "👹 Boss battle: the red army is different on purpose. A few goblins, then one giant ogre against your whole team.",
    names: { ogreKing: "Ogre King" },
    hints: [
      {
        title: "Spot the boss",
        text: "Find the ogre and remember it in a variable (it's undefined until someone sees him).",
        code: `let boss = enemies.find(e => e.type == "ogre")`,
      },
      {
        title: "Dodge the stomp",
        text: "If the boss can stomp and you're close, back off! Otherwise, attack.",
        code: `let boss = enemies.find(e => e.type == "ogre")
if (boss && boss.specialReady && me.distanceTo(boss) < 140) {
  me.moveAwayFrom(boss)
} else if (enemy) {
  me.attack(enemy)
}`,
      },
      {
        title: "Archers win this",
        text: "The ogre is slow. Archers that keep escaping while shooting can beat him almost alone!",
      },
    ],
  },
  royale: {
    title: "Code Royale",
    tagline: "Face the Red Champion",
    story: "The final duel! The Red Champion commands the exact same army as you, and their code is VERY clever: they scout, follow, focus weak targets, escape when hurt and use specials. Only the best commander wins the crown. 👑",
    learn: "Everything you learned, together. Peek at the champion's code after a defeat to learn their tricks!",
    hints: [
      {
        title: "Know your enemy",
        text: "Lose once, then press \"Spy on Red\" to read the champion's code. Then beat it!",
      },
      {
        title: "Team memory",
        text: "team is an object shared by all your fighters. One fighter can choose a target and everybody follows!",
        code: `if (!team.target || !enemies.find(e => e.id == team.target.id)) {
  team.target = me.weakestEnemy()
}
let target = team.target && enemies.find(e => e.id == team.target.id)`,
      },
      {
        title: "Strike from the shadows",
        text: "The bushes in the corners and the middle are perfect for an ambush…",
      },
    ],
  },
  endless: {
    title: "Endless Horde",
    tagline: "How long can you survive?",
    story: "Wave after wave after wave. Each one is bigger than the last, and an ogre shows up every 7 waves. Between waves your fighters patch themselves up a little. How far can your code go?",
    learn: "No new tricks: this is where your best code shines. Beat your own record!",
    note: "🌊 Survival mode: wave after wave of red fighters. The waves are not the same as your army; they just keep getting bigger.",
    hints: [
      {
        title: "Survive, then fight",
        text: "Hurt fighters can step back behind the knights, or hide in a bush until things calm down.",
        code: `if (me.health < me.maxHealth * 0.3 && me.type != "knight") {
  me.hide()
  return
}`,
      },
      {
        title: "return",
        text: "return stops your code for this fighter right away. It's a handy way to say \"I'm done deciding!\"",
      },
    ],
  },
};
