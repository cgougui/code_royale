import ts from "typescript";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

export const layers = [
  { name: "engine", dir: "packages/engine/src", allow: ["acorn"] },
  {
    name: "content",
    dir: "packages/content/src",
    allow: ["@code-royale/engine"],
  },
  {
    name: "renderer",
    dir: "packages/renderer/src",
    allow: ["@code-royale/engine"],
  },
  {
    name: "engine tests",
    dir: "packages/engine/test",
    allow: ["vitest", "@code-royale/engine"],
    local: "packages/engine",
  },
  {
    name: "content tests",
    dir: "packages/content/test",
    allow: ["vitest", "acorn", "@code-royale/engine", "@code-royale/content"],
    local: "packages/content",
  },
  {
    name: "renderer tests",
    dir: "packages/renderer/test",
    allow: ["vitest", "@code-royale/engine", "@code-royale/renderer"],
    local: "packages/renderer",
  },
  {
    name: "domain",
    dir: "app/domain",
    allow: ["@code-royale/engine", "@code-royale/content"],
    app: [],
  },
  {
    name: "runtime",
    dir: "app/runtime",
    allow: ["@code-royale/engine", "@code-royale/content"],
    app: ["domain"],
  },
  {
    name: "hooks",
    dir: "app/hooks",
    allow: [
      "react",
      "@code-royale/engine",
      "@code-royale/content",
      "@code-royale/renderer",
    ],
    app: ["domain", "runtime"],
  },
  {
    name: "i18n",
    dir: "app/i18n",
    allow: [
      "react",
      "i18next",
      "react-i18next",
      "i18next-browser-languagedetector",
      "@code-royale/engine",
      "@code-royale/content",
      "@code-royale/renderer",
    ],
    app: ["domain"],
  },
  {
    name: "components",
    dir: "app/components",
    allow: "*",
    app: ["domain", "hooks", "i18n"],
  },
  {
    name: "features",
    dir: "app/features",
    allow: "*",
    app: ["domain", "hooks", "components", "i18n"],
  },
  {
    name: "routes",
    dir: "app/routes",
    allow: ["react", "react-router"],
    app: ["features"],
  },
  {
    name: "app tests",
    dir: "app/test",
    allow: ["vitest", "i18next", "@code-royale/engine", "@code-royale/content"],
    app: ["domain", "runtime", "hooks", "i18n"],
  },
  {
    name: "shell",
    dir: "app",
    allow: "*",
    app: ["features", "routes", "components", "i18n"],
  },
];

export function isWithin(base, target) {
  const path = relative(base, target);
  return (
    path === "" ||
    (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`))
  );
}

/** Parse TS syntax so comments, side-effect imports and multiline imports are handled correctly. */
export function dependencies(source, filename = "module.ts") {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const specs = [];
  const add = (node) => {
    if (node && ts.isStringLiteralLike(node)) specs.push(node.text);
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      add(node.moduleSpecifier);
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    )
      add(node.moduleReference.expression);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
      add(node.argument.literal);
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    )
      add(node.arguments[0]);
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "URL"
    )
      add(node.arguments?.[0]);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return specs;
}

export function layerFor(root, file) {
  return layers.find((layer) => isWithin(resolve(root, layer.dir), file));
}

export function checkSource(root, file, source) {
  const layer = layerFor(root, file);
  if (!layer) return [];
  const errors = [];
  for (const spec of dependencies(source, file)) {
    const where = `${relative(root, file)} → "${spec}"`;
    if (spec.startsWith(".") || spec.startsWith("~/") || isAbsolute(spec)) {
      const target = spec.startsWith("~/")
        ? resolve(root, "app", spec.slice(2))
        : resolve(dirname(file), spec);
      const home = resolve(root, layer.local ?? layer.dir);
      if (layer.app) {
        const destination = layerFor(root, target);
        if (
          !destination ||
          (destination.name !== layer.name &&
            !layer.app.includes(destination.name))
        ) {
          errors.push(`${layer.name}: forbidden local dependency: ${where}`);
        }
      } else if (!isWithin(home, target)) {
        errors.push(
          `${layer.name}: relative import leaves the layer: ${where}`,
        );
      }
      continue;
    }
    if (/^@code-royale\/[^/]+\//.test(spec)) {
      errors.push(
        `${layer.name}: deep import, use the package entry point: ${where}`,
      );
      continue;
    }
    const pkg = spec.startsWith("@")
      ? spec.split("/").slice(0, 2).join("/")
      : spec.split("/")[0];
    if (
      layer.allow !== "*" &&
      !layer.allow.includes(pkg) &&
      !layer.allow.includes(spec)
    ) {
      errors.push(`${layer.name}: forbidden dependency: ${where}`);
    }
  }
  return errors;
}
