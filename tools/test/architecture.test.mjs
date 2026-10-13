import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { checkSource, dependencies, isWithin } from "../architecture.mjs";

const root = resolve("/tmp/project");
const check = (file, source) => checkSource(root, resolve(root, file), source);

describe("architecture enforcement", () => {
  it("finds all supported dependency syntax and ignores imports in comments", () => {
    expect(
      dependencies(`
      // import x from "ignored";
      import "side-effect";
      import type { A } from "types";
      export { B } from "exported";
      const a = import("dynamic");
      type X = import("inline-type").X;
      const b = require("required");
      import c = require("equals");
      new Worker(new URL("./worker.ts", import.meta.url));
    `),
    ).toEqual([
      "side-effect",
      "types",
      "exported",
      "dynamic",
      "inline-type",
      "required",
      "equals",
      "./worker.ts",
    ]);
  });

  it("rejects forbidden package imports, including side effects and deep paths", () => {
    expect(
      check("packages/engine/src/file.ts", 'import "react";'),
    ).toHaveLength(1);
    expect(
      check(
        "packages/content/src/file.ts",
        'import { x } from "@code-royale/renderer";',
      ),
    ).toHaveLength(1);
    expect(
      check(
        "app/features/game/file.ts",
        'import { x } from "@code-royale/engine/src/world/state";',
      ),
    ).toHaveLength(1);
    expect(
      check(
        "packages/renderer/src/file.ts",
        'import type { Frame } from "@code-royale/engine";',
      ),
    ).toEqual([]);
  });

  it("enforces app responsibilities through relative paths and the app alias", () => {
    expect(
      check(
        "app/domain/file.ts",
        'import { x } from "~/runtime/progress-store";',
      ),
    ).toHaveLength(1);
    expect(
      check("app/runtime/file.ts", 'import { x } from "../components/Arena";'),
    ).toHaveLength(1);
    expect(
      check(
        "app/components/file.tsx",
        'import { x } from "~/runtime/battle-run";',
      ),
    ).toHaveLength(1);
    expect(
      check("app/hooks/file.ts", 'import { x } from "../domain/progress";'),
    ).toEqual([]);
    expect(
      check(
        "app/features/game/file.tsx",
        'import { x } from "~/hooks/use-battle-session";',
      ),
    ).toEqual([]);
    expect(
      check(
        "app/routes/file.tsx",
        'import { GameScreen } from "~/features/game/GameScreen";',
      ),
    ).toEqual([]);
  });

  it("does not treat a sibling path with the same prefix as part of a layer", () => {
    expect(
      isWithin(
        "/tmp/project/app/domain",
        "/tmp/project/app/domain-other/file.ts",
      ),
    ).toBe(false);
    expect(
      check(
        "packages/engine/src/file.ts",
        'export { x } from "../src-other/file";',
      ),
    ).toHaveLength(1);
  });
});
