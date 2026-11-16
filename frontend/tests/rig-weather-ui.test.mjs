import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";

const root = readFileSync(new URL("../src/components/rig-ui/RigUiRoot.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/content/rig-ui.css", import.meta.url), "utf8");

test("scene has one clock and one weather control panel", () => {
  assert.equal((root.match(/id="clock"/g) ?? []).length, 1);
  assert.equal((root.match(/id="clockToggle"/g) ?? []).length, 1);
  assert.equal((root.match(/className="atmo"/g) ?? []).length, 1);
  assert.equal((root.match(/windOverride: Number\(event\.target\.value\)/g) ?? []).length, 1);
});

test("weather container is not overridden with a two-column grid", () => {
  assert.doesNotMatch(css, /#clock\s+\.atmo\s*\{\s*display\s*:\s*grid/);
  assert.match(css, /#clock:not\(\.compact\)\s*\{[^}]*width:min\(400px,calc\(100% - 20px\)\)/);
  assert.match(css, /#clock\s+\.seg\.wrap\s+button\s*\{[^}]*min-width:max-content/);
});

test("weather and season switches preserve the current wind setting", async () => {
  const require = createRequire(import.meta.url);
  const previousLoader = require.extensions[".ts"];
  require.extensions[".ts"] = (module, filename) => {
    const source = readFileSync(filename, "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    module._compile(compiled, filename);
  };
  let ClassicRigRuntime;
  try {
    ({ ClassicRigRuntime } = require("../vendor/classic-rig-runtime/src/simulation/ClassicRigRuntime.ts"));
  } finally {
    if (previousLoader) require.extensions[".ts"] = previousLoader;
    else delete require.extensions[".ts"];
  }
  const runtime = new ClassicRigRuntime({ config: { auto: false } });
  const sourceFile = ts.createSourceFile("RigUiRoot.tsx", root, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let helper;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === "setWeatherKeepingWind") helper = node.initializer.getText(sourceFile);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  assert.ok(helper, "weather change handler not found");
  const compiled = ts.transpileModule(`const handler = ${helper};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const apply = new Function("runtime", "setSnapshot", `${compiled}\nreturn handler;`)(runtime, () => {});

  const initialWind = runtime.getSnapshot().weather.wind;
  apply({ preset: "cloudy" });
  runtime.update(5);
  assert.equal(runtime.getSnapshot().weather.wind, initialWind);
  assert.equal(runtime.getSnapshot().weather.preset, "cloudy");

  runtime.dispatch({ type: "set_weather", weather: { windOverride: 12 } });
  apply({ preset: "rain" });
  apply({ season: "winter" });
  runtime.update(5);
  const after = runtime.getSnapshot().weather;
  assert.equal(after.windOverride, 12);
  assert.equal(after.preset, "snow");
  assert.equal(after.season, "winter");
  assert.ok(after.wind > initialWind && after.wind <= 12);
});