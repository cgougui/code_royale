export interface ApiDoc {
  /** Text inserted by autocomplete. */
  name: string;
  /** How it looks when used. */
  usage: string;
  description: string;
  example?: string;
  kind: "method" | "property" | "variable" | "function";
}

export interface ApiGroup {
  title: string;
  emoji: string;
  intro: string;
  owner: "me" | "global" | "unit";
  items: ApiDoc[];
}

export const API_GROUPS: ApiGroup[] = [
  {
    title: "Give orders",
    emoji: "📣",
    intro: "Tell your fighter what to do right now. If you give two orders, the last one wins!",
    owner: "me",
    items: [
      { name: "attack", usage: "me.attack(enemy)", kind: "method", description: "Walk to the enemy and hit it (or shoot it, if you're an archer, mage or healer).", example: "me.attack(me.nearestEnemy())" },
      { name: "moveTo", usage: "me.moveTo(x, y)  or  me.moveTo(thing)", kind: "method", description: "Walk to a spot in the arena, or to a thing like an item or a friend.", example: "me.moveTo(arena.centerX, arena.centerY)" },
      { name: "moveAwayFrom", usage: "me.moveAwayFrom(thing)", kind: "method", description: "Run away from something (a bit slower than walking forward).", example: "me.moveAwayFrom(me.nearestEnemy())" },
      { name: "heal", usage: "me.heal(friend)", kind: "method", description: "Healers only: walk close to a friend and heal them. Healers can heal themselves with me.heal(me).", example: "me.heal(me.weakestAlly())" },
      { name: "special", usage: "me.special(target)", kind: "method", description: "Use your special move, if it's charged (see me.specialReady). Some special moves need a target or a spot.", example: "if (me.specialReady) me.special(me.nearestEnemy())" },
      { name: "say", usage: 'me.say("text")', kind: "method", description: "Show a speech bubble above your fighter.", example: 'me.say("Charge!")' },
      { name: "stop", usage: "me.stop()", kind: "method", description: "Stand still and do nothing." },
    ],
  },
  {
    title: "Find things",
    emoji: "🔎",
    intro: "Ask questions about the battlefield. These give back a fighter or item, or null if there's nothing.",
    owner: "me",
    items: [
      { name: "nearestEnemy", usage: "me.nearestEnemy()", kind: "method", description: "The closest enemy.", example: "let enemy = me.nearestEnemy()" },
      { name: "weakestEnemy", usage: "me.weakestEnemy()", kind: "method", description: "The enemy with the least health. Perfect to finish someone off!", example: "me.attack(me.weakestEnemy())" },
      { name: "strongestEnemy", usage: "me.strongestEnemy()", kind: "method", description: "The enemy with the most health." },
      { name: "nearestAlly", usage: "me.nearestAlly()", kind: "method", description: "The closest friend (not you)." },
      { name: "weakestAlly", usage: "me.weakestAlly()", kind: "method", description: "The friend who is hurt the most (not you).", example: "me.heal(me.weakestAlly())" },
      { name: "nearestItem", usage: "me.nearestItem()  or  me.nearestItem(\"potion\")", kind: "method", description: "The closest treasure on the ground. You can ask for a kind: \"potion\", \"rage\" or \"shield\".", example: "let item = me.nearestItem()" },
      { name: "enemiesNear", usage: "me.enemiesNear(distance)", kind: "method", description: "A list of enemies closer than the distance. Use .length to count them!", example: "if (me.enemiesNear(80).length >= 3) me.special()" },
      { name: "alliesNear", usage: "me.alliesNear(distance)", kind: "method", description: "A list of friends closer than the distance." },
      { name: "distanceTo", usage: "me.distanceTo(thing)", kind: "method", description: "How far away something is. The arena is 960 wide and 600 tall.", example: "if (me.distanceTo(enemy) < 100) { ... }" },
      { name: "inRange", usage: "me.inRange(enemy)", kind: "method", description: "true if you're close enough to attack that enemy without moving." },
    ],
  },
  {
    title: "About me",
    emoji: "🙋",
    intro: "Everything your fighter knows about itself.",
    owner: "me",
    items: [
      { name: "type", usage: "me.type", kind: "property", description: 'What kind of fighter: "knight", "archer", "healer" or "mage".', example: 'if (me.type == "archer") { ... }' },
      { name: "health", usage: "me.health", kind: "property", description: "How much health you have left." },
      { name: "maxHealth", usage: "me.maxHealth", kind: "property", description: "Your health when you're fully healed.", example: "if (me.health < me.maxHealth / 2) { ... }" },
      { name: "x", usage: "me.x", kind: "property", description: "Where you are, left (0) to right (960)." },
      { name: "y", usage: "me.y", kind: "property", description: "Where you are, top (0) to bottom (600)." },
      { name: "specialReady", usage: "me.specialReady", kind: "property", description: "true when your special move is charged. ⭐ A star shows next to the health bar when it is!" },
      { name: "specialCooldown", usage: "me.specialCooldown", kind: "property", description: "Seconds left before the special move is ready." },
      { name: "range", usage: "me.range", kind: "property", description: "How far your attack reaches." },
      { name: "name", usage: "me.name", kind: "property", description: "Your fighter's name." },
      { name: "index", usage: "me.index", kind: "property", description: "Your fighter's number in the team: 0, 1, 2…  Handy to give each one a different job!" },
      { name: "isRaging", usage: "me.isRaging", kind: "property", description: "true while a Rage Gem doubles your damage." },
      { name: "hasShield", usage: "me.hasShield", kind: "property", description: "true while a Shield Orb protects you." },
      { name: "memory", usage: "me.memory", kind: "property", description: "A box where this fighter can remember things from one moment to the next.", example: "me.memory.hits = (me.memory.hits || 0) + 1" },
    ],
  },
  {
    title: "The world",
    emoji: "🌍",
    intro: "Things you can use anywhere in your code.",
    owner: "global",
    items: [
      { name: "enemies", usage: "enemies", kind: "variable", description: "A list of all enemies still standing.", example: 'let mage = enemies.find(e => e.type == "mage")' },
      { name: "allies", usage: "allies", kind: "variable", description: "A list of your friends still standing (not you)." },
      { name: "items", usage: "items", kind: "variable", description: "A list of treasures on the ground. Each has a kind: \"potion\", \"rage\" or \"shield\"." },
      { name: "time", usage: "time", kind: "variable", description: "Seconds since the battle started.", example: "if (time < 3) me.say(\"Ready...\")" },
      { name: "arena", usage: "arena.width  arena.height  arena.centerX  arena.centerY", kind: "variable", description: "The size of the arena." },
      { name: "team", usage: "team", kind: "variable", description: "A box shared by ALL your fighters. Great for teamwork!", example: "team.target = me.weakestEnemy()" },
      { name: "log", usage: "log(something)", kind: "function", description: "Write a message in the console below the code. Great to find bugs!", example: "log(me.name, me.health)" },
      { name: "distance", usage: "distance(a, b)", kind: "function", description: "How far apart two things are." },
      { name: "random", usage: "random()", kind: "function", description: "A random number between 0 and 1." },
    ],
  },
  {
    title: "Looking at other fighters",
    emoji: "👀",
    intro: "Fighters you find (like me.nearestEnemy()) have these too:",
    owner: "unit",
    items: [
      { name: "type", usage: "enemy.type", kind: "property", description: 'Their kind: "knight", "archer", "healer", "mage", "goblin" or "ogre".' },
      { name: "health", usage: "enemy.health", kind: "property", description: "Their health left." },
      { name: "maxHealth", usage: "enemy.maxHealth", kind: "property", description: "Their full health." },
      { name: "x", usage: "enemy.x  enemy.y", kind: "property", description: "Where they are." },
      { name: "specialReady", usage: "enemy.specialReady", kind: "property", description: "true if THEIR special move is charged. Watch out!" },
      { name: "id", usage: "enemy.id", kind: "property", description: "A number that is different for every fighter." },
      { name: "name", usage: "enemy.name", kind: "property", description: "Their name." },
    ],
  },
];

export const ME_DOCS = API_GROUPS.filter((g) => g.owner === "me").flatMap((g) => g.items);
export const GLOBAL_DOCS = API_GROUPS.filter((g) => g.owner === "global").flatMap((g) => g.items);
export const UNIT_DOCS = API_GROUPS.filter((g) => g.owner === "unit").flatMap((g) => g.items);
