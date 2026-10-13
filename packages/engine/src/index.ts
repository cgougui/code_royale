/**
 * @code-royale/engine: the deterministic battle simulation and the script sandbox.
 *
 * No DOM, no React, no timers: pure TypeScript that runs anywhere (browser, worker, Node).
 * Everything outside this package talks to it through this file only.
 */
export * from "./protocol";
export * from "./rules";
export * from "./units";
export { Battle } from "./battle";
export { runBattle, type RunHooks } from "./headless";
export { checkSyntax, compile, friendlyRuntime, SCRIPT_GLOBALS } from "./scripting/sandbox";
export { formatValue } from "./scripting/format";
export { makeRng } from "./math/rng";
export type { UnitView, ItemView } from "./scripting/api";
export { debugBattle, stepTarget, type StepMove } from "./debug";
