import type { LogEntry, Message } from "@code-royale/engine";

/** Messages the app adds to the engine's. Like those, they are codes: the text is in the locale catalogs. */
export interface AppMessageParams {
  "app.unexpected": { detail: string };
  "app.codeStuck": Record<string, never>;
  "app.traceStuck": Record<string, never>;
  "app.noFighterStanding": Record<string, never>;
  "app.needBreakpoint": Record<string, never>;
  "app.battleEnd": Record<string, never>;
}

/** Anything the player can be told: the engine's messages and the app's own. */
export type AppMessage =
  | Message
  | {
      [C in keyof AppMessageParams]: { code: C; params: AppMessageParams[C] };
    }[keyof AppMessageParams];

export function appMessage<C extends keyof AppMessageParams>(
  code: C,
  ...params: AppMessageParams[C] extends Record<string, never>
    ? []
    : [AppMessageParams[C]]
): AppMessage {
  return { code, params: params[0] ?? {} } as AppMessage;
}

/** A console line: the engine's, or one the app adds (a battle that could not run). */
export type ConsoleEntry =
  | LogEntry
  | {
      tick: number;
      kind: "error";
      message: AppMessage;
      line?: number;
      unit?: string;
    };
