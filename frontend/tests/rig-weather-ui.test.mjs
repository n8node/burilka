import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

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
});