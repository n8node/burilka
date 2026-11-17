import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const root = readFileSync(new URL("../src/components/rig-ui/RigUiRoot.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/content/rig-ui.css", import.meta.url), "utf8");
const content = JSON.parse(readFileSync(new URL("../src/content/rig-ui-classic-content.json", import.meta.url), "utf8"));

test("equipment card has separate title, system, details and focus button", () => {
  assert.match(root, /<aside id="panel"/);
  assert.match(root, /className="rig"/);
  assert.match(root, /className="sys"/);
  assert.match(root, /<h2>\{selectedCard\.name\}<\/h2>/);
  assert.match(root, /<div className="btns"><button[^>]*onClick=\{\(\) => sceneRef\.current\?\.focus\(selected\)\}/);
  assert.match(root, /aria-label="Закрыть карточку"/);
  assert.match(root, /sceneRef\.current\?\.highlight\(null\)/);
});

test("equipment card styles remain scoped and fit the scene", () => {
  assert.match(css, /\.rig-ui #panel\{[^}]*width:min\(400px,calc\(100% - 28px\)\)/);
  assert.match(css, /\.rig-ui #panel \.rig\{[^}]*display:block/);
  assert.match(css, /\.rig-ui #panel \.sys\{[^}]*border-radius:20px/);
  assert.match(css, /\.rig-ui #panel td:first-child\{[^}]*width:46%/);
  assert.match(css, /\.rig-ui #panel \.btns button\{/);
});

test("canvas supports hover and maps worker cards to the workers section", () => {
  const source = readFileSync(new URL("../src/components/rig-ui/content.ts", import.meta.url), "utf8");
  assert.match(source, /kind === "worker" \? "workers" : kind/);
  assert.match(root, /onPointerMove=\{hoverCanvas\}/);
  assert.match(root, /onPointerLeave=/);
  assert.match(root, /pick\(event\.clientX - rect\.left, event\.clientY - rect\.top, hasCard\)/);
  for (const id of ["driller_A", "helper1_A", "derrick_A", "master"]) assert.ok(content.cards[content.units.workers[id]]);
});

test("cutaway button toggles visibility and the underground view enables it", () => {
  assert.match(root, /onClick=\{\(\) => setCutVisible\(!undergroundVisibleRef\.current\)\}/);
  assert.match(root, /aria-pressed=\{undergroundVisible\}/);
  assert.match(root, /scene\.setUndergroundVisible\(undergroundVisibleRef\.current\)/);
  assert.match(root, /if \(view\.cut \|\| view\.id === "underground"\) setCutVisible\(true\)/);
  const file = ts.createSourceFile("RigUiRoot.tsx", root, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let helper;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === "setCutVisible") helper = node.initializer.getText(file);
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(helper);
  const compiled = ts.transpileModule(`const handler = ${helper};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const ref = { current: true };
  const calls = [];
  const handler = new Function("undergroundVisibleRef", "setUndergroundVisible", "sceneRef", `${compiled}\nreturn handler;`)(ref, (value) => calls.push(["state", value]), { current: { setUndergroundVisible: (value) => calls.push(["scene", value]) } });
  handler(!ref.current);
  handler(!ref.current);
  assert.deepEqual(calls, [["state", false], ["scene", false], ["state", true], ["scene", true]]);
});