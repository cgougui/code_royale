export type Team = "blue" | "red";
export type UnitType = "knight" | "archer" | "healer" | "mage" | "goblin" | "ogre";
export type ItemKind = "potion" | "rage" | "shield";
export type ProjectileKind = "arrow" | "bolt" | "fireball" | "powershot";

export interface UnitStats {
  label: string;
  emoji: string;
  hp: number;
  speed: number; // world units per second
  radius: number;
  range: number; // edge-to-edge attack range
  damage: number;
  cooldown: number; // seconds between attacks
  projectile?: ProjectileKind;
  splash?: number; // splash radius for area attacks
  heal?: number;
  healRange?: number;
  special: { name: string; cooldown: number; description: string };
  description: string;
}

/** Static information about a unit, sent once to the renderer. */
export interface UnitInfo {
  id: number;
  type: UnitType;
  team: Team;
  name: string;
  maxHp: number;
  radius: number;
}

export interface UnitSnap {
  id: number;
  x: number;
  y: number;
  hp: number;
  facing: number;
  moving: boolean;
  alive: boolean;
  say?: string;
  raging: boolean;
  shield: number;
  specialReady: boolean;
}

export interface ProjectileSnap {
  id: number;
  kind: ProjectileKind;
  team: Team;
  x: number;
  y: number;
  angle: number;
}

export interface ItemSnap {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
}

export type GameEvent =
  | { k: "spawn"; unit: UnitInfo; x: number; y: number }
  | { k: "swing"; id: number; angle: number }
  | { k: "shoot"; id: number; kind: ProjectileKind }
  | { k: "hit"; id: number; amount: number; x: number; y: number; big?: boolean; blocked?: boolean }
  | { k: "heal"; id: number; amount: number; x: number; y: number }
  | { k: "death"; id: number; x: number; y: number; team: Team }
  | { k: "explode"; x: number; y: number; r: number; kind: "fire" | "stomp" | "meteor" | "holy" }
  | { k: "whirl"; id: number; x: number; y: number; r: number }
  | { k: "warn"; x: number; y: number; r: number; ticks: number }
  | { k: "pickup"; id: number; item: ItemKind; x: number; y: number }
  | { k: "special"; id: number; name: string; x: number; y: number }
  | { k: "wave"; n: number };

export interface Frame {
  tick: number;
  units: UnitSnap[];
  projectiles: ProjectileSnap[];
  items: ItemSnap[];
  events: GameEvent[];
}

export interface BattleResult {
  winner: Team | "draw";
  time: number;
  blueAlive: number;
  blueTotal: number;
  redAlive: number;
  redTotal: number;
  redKilled: number;
  damageDealt: number;
  healingDone: number;
  wave: number;
  said: boolean;
}

export interface LogEntry {
  tick: number;
  kind: "log" | "error" | "warn" | "info";
  text: string;
  line?: number;
  unit?: string;
}

export interface SpawnSpec {
  type: UnitType;
  x: number;
  y: number;
  name?: string;
}

export interface ItemSpawnSpec {
  kind: ItemKind;
  x: number;
  y: number;
  at: number; // seconds
}

/** Messages exchanged with the battle worker. */
export type ToWorker = { type: "run"; levelId: string; blueCode: string; seed: number };
export type FromWorker =
  | { type: "compileError"; message: string; line?: number; col?: number }
  | { type: "init"; units: UnitInfo[]; arena: { width: number; height: number } }
  | { type: "frames"; frames: Frame[]; logs: LogEntry[] }
  | { type: "done"; result: BattleResult };
