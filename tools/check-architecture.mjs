// npm run check:arch: enforce package and app responsibility boundaries.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkSource } from "./architecture.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? files(path)
      : /\.(ts|tsx|mts)$/.test(entry.name)
        ? [path]
        : [];
  });
}

const errors = ["packages", "app"]
  .flatMap((dir) => files(join(root, dir)))
  .flatMap((file) => checkSource(root, file, readFileSync(file, "utf8")));

if (errors.length) {
  console.error(
    `✗ Architecture check failed (${errors.length}):\n  ${errors.join("\n  ")}`,
  );
  process.exit(1);
}
console.log(
  "✓ Architecture check passed: package boundaries + domain/runtime/hooks/UI",
);
