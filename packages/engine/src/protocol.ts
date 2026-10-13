/**
 * The engine's public data contract.
 *
 * Input:  BattleSetup (armies, terrain, scripts, seed).
 * Output: a stream of Frames (snapshots + events), LogEntries, and a BattleResult.
 *
 * Everything here is plain serialisable data (no classes, no functions), so it can
 * cross a Web Worker boundary or be written to disk as a replay.
 */
export type Team = "blue" | "red";
export type UnitType = "knight" | "archer" | "scout" | "mage" | "goblin" | "ogre";
export type ItemKind = "potion" | "rage" | "shield";
export type ProjectileKind = "arrow" | "knife" | "fireball" | "powershot";

/** A round area of the map: a bush to hide in, or a rock that blocks moving and seeing. */
export interface Circle {
  x: number;
  y: number;
  r: number;
}

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
  sight: number; // detection radius: how far the fighter can spot enemies
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
  /** The other team can see this fighter right now. */
  seen: boolean;
  /** Hiding in a bush (and not given away by attacking). */
  hidden: boolean;
  /** Vanished in a smoke bomb (scout special). */
  vanish: boolean;
  /** What the fighter is doing right now. */
  act: "idle" | "wait" | "attack" | "move" | "escape" | "explore" | "patrol" | "follow" | "circle" | "hide";
  /** Who it's attacking / following / circling. */
  target?: number;
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
  | { k: "wave"; n: number }
  | { k: "spotted"; id: number; by: Team; x: number; y: number }
  | { k: "smoke"; id: number; x: number; y: number }
  | { k: "lost"; id: number; by: Team; x: number; y: number };

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

/** Everything needed to run one battle. Deterministic: same setup + seed = same battle. */
export interface BattleSetup {
  blue: SpawnSpec[];
  red: SpawnSpec[];
  blueCode: string;
  redCode: string;
  items?: ItemSpawnSpec[];
  bushes?: Circle[];
  rocks?: Circle[];
  /** Seconds before the battle ends in a draw. */
  timeLimit: number;
  /** Extra red waves that arrive when the previous one is defeated. */
  waves?: SpawnSpec[][];
  /** Endless red waves, generated on the fly. */
  endless?: boolean;
  seed: number;
}

/** A problem in the player's script found before the battle starts. */
export interface CompileError {
  message: string;
  line?: number;
  col?: number;
}

// ---- Debugger (step-by-step execution of the player's script) ----

/** A value as the debugger shows it: a one-line summary plus (for lists and objects) what's inside. */
export interface Inspected {
  text: string;
  kind: "number" | "string" | "boolean" | "empty" | "function" | "list" | "object" | "unset";
  children?: { key: string; value: Inspected }[];
  /** How many children were left out (too many, or too deep). */
  more?: number;
}

export interface TraceVar {
  name: string;
  value: Inspected;
}

/** One moment of a script's run: the statement about to run, or how the run ended. */
export interface TraceStep {
  /** "line": about to run a statement. "end": the script finished. "error": the script crashed. */
  kind: "line" | "end" | "error";
  /** 1-based lines and 0-based columns of the statement (for "end", none). */
  line?: number;
  col?: number;
  endLine?: number;
  endCol?: number;
  /** How many function calls deep we are (0 = the top level of the script). */
  depth: number;
  /** Variables visible here, innermost first. */
  vars: TraceVar[];
  /** The order given so far this tick, like `me.attack(Bob)` (null: no order yet). */
  order: string | null;
  /** How many `Trace.output` lines had been printed before this step. */
  output: number;
  error?: string;
}

/** Everything one fighter's script did during one tick. */
export interface Trace {
  tick: number;
  unitId: number;
  unitName: string;
  /** What the fighter knew when its script started: me, enemies, allies, items, time. */
  context: TraceVar[];
  steps: TraceStep[];
  /** log() / warnings printed during this run. */
  output: { kind: LogEntry["kind"]; text: string }[];
  /** More steps ran than the debugger keeps. */
  truncated: boolean;
}

export interface TraceRequest {
  /** Trace the scripts that run at this tick (they see the world as the frame of tick `tick` shows it). */
  tick: number;
  /** The fighter to trace. */
  unitId: number;
  /** When set: go forward from `tick` to the first tick where a blue fighter reaches one of these lines. */
  breakpoints?: number[];
}

export type TraceReply =
  | { kind: "trace"; trace: Trace }
  | { kind: "compileError"; error: CompileError }
  | { kind: "unavailable"; reason: string };
