import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

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