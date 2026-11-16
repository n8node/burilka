import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function loadModule(file, dependencies = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  new Function("exports", "require", compiled)(exports, (name) => dependencies[name]);
  return exports;
}
const layout = loadModule("../src/lib/rig-layout.ts");
const { RigSimulation, drillingSteps, standPose } = loadModule("../src/lib/rig-simulation.ts", { "./rig-layout": layout });

test("drilling and connection steps follow the reference order", () => {
  const rig = new RigSimulation();
  assert.deepEqual(drillingSteps.map((step) => step.id), ["drill", "slips", "breakTD", "tdUp", "latch", "lift", "stab", "makeup", "tdConnect", "release"]);
  rig.start();
  rig.advance(9);
  assert.equal(rig.snapshot.phase, "drill");
  assert.equal(rig.snapshot.height, -2);
  assert.equal(rig.snapshot.depth, 2);
  assert.ok(rig.snapshot.pumpAngle > 0);
  rig.advance(9);
  assert.equal(rig.snapshot.phase, "slips");
  assert.equal(rig.snapshot.pumpRpm, 0);
  assert.equal(rig.snapshot.slipsClosed, true);
  rig.advance(2.5);
  assert.equal(rig.snapshot.phase, "breakTD");
  assert.equal(rig.snapshot.workers[1].task, "look");
});

test("pause freezes state; restart resumes without resetting phase or rotations", () => {
  const rig = new RigSimulation();
  rig.start(); rig.advance(22);
  rig.pause();
  const before = rig.snapshot;
  rig.advance(50);
  assert.equal(rig.snapshot.phase, before.phase);
  assert.equal(rig.snapshot.progress, before.progress);
  assert.equal(rig.snapshot.driveAngle, before.driveAngle);
  assert.equal(rig.snapshot.driveRpm, 0);
  rig.start(); rig.advance(1);
  assert.notEqual(rig.snapshot.progress, before.progress);
});

test("large deltas cross phases and cycles without losing elapsed time", () => {
  const rig = new RigSimulation();
  const cycleTime = drillingSteps.reduce((sum, step) => sum + step.duration, 0);
  rig.start(); rig.advance(cycleTime * 2 + 3);
  assert.equal(rig.snapshot.phase, "drill");
  assert.equal(rig.snapshot.cycle, 3);
  assert.ok(Math.abs(rig.snapshot.progress - 3 / 18) < 1e-8);
  rig.reset();
  assert.equal(rig.snapshot.cycle, 1);
  assert.equal(rig.snapshot.depth, 0);
  assert.equal(rig.snapshot.running, false);
});

test("scenario data can override durations and operating parameters", () => {
  const custom = [{ ...drillingSteps[0], duration: 4, pumpRpm: 120 }, { ...drillingSteps[1], duration: 2 }];
  const rig = new RigSimulation(custom);
  rig.start(); rig.advance(2);
  assert.equal(rig.snapshot.pumpRpm, 120);
  assert.equal(rig.snapshot.depth, 2);
  rig.advance(2);
  assert.equal(rig.snapshot.phase, "slips");
  assert.throws(() => new RigSimulation([{ ...drillingSteps[0], duration: 0 }]));
});

test("rig crew and upper derrick remain on their respective decks", () => {
  assert.ok(layout.RIG_FLOOR_Y >= 8.7);
  for (const id of ["crew-driller", "crew-helper1", "crew-helper2"]) assert.equal(layout.crewPlacement[id][1], layout.RIG_FLOOR_Y);
  assert.equal(layout.crewPlacement["crew-derrick"][1], layout.DERRICK_FLOOR_Y);
  assert.equal(layout.floorLevel(layout.crewPlacement["crew-derrick"]), "derrick");
  for (const step of drillingSteps) {
    for (const helper of step.helpers) assert.equal(helper.destination[1], layout.RIG_FLOOR_Y);
  }
  const rig = new RigSimulation();
  assert.equal(rig.snapshot.derrick.destination[1], layout.DERRICK_FLOOR_Y);
  rig.start(); rig.advance(18 + 2.5 + 4 + 4);
  assert.equal(rig.snapshot.phase, "latch");
  assert.equal(rig.snapshot.derrick.task, "reach");
});

test("stand transfers from setback to well and resets on the next cycle", () => {
  const parked = standPose("drill", 0);
  assert.deepEqual([parked.x, parked.y, parked.z], [3.2, 20.9, 0]);
  const midway = standPose("lift", 0.5);
  assert.ok(midway.x > 0 && midway.x < parked.x);
  assert.ok(midway.y > parked.y);
  const stabbed = standPose("stab", 1);
  assert.equal(stabbed.x, 0);
  assert.equal(standPose("release", 0).visible, false);
  const rig = new RigSimulation();
  rig.start();
  rig.advance(drillingSteps.reduce((sum, step) => sum + step.duration, 0));
  assert.equal(rig.snapshot.cycle, 2);
  assert.equal(rig.snapshot.stand.visible, true);
  assert.equal(rig.snapshot.stand.x, parked.x);
});

test("ground-to-rig routes use the measured catwalk ramp, never a direct vertical shortcut", () => {
  const fromGround = [-7.4, 0, 8.4];
  const onDeck = [-2, layout.RIG_FLOOR_Y, 2.8];
  const route = layout.routeBetweenLevels(fromGround, onDeck);
  assert.ok(route.length >= 5);
  assert.deepEqual(route.at(-1), onDeck);
  for (let i = 1; i < route.length - 1; i++) assert.ok(Math.abs(route[i][1] - route[i - 1][1]) <= 4);
  assert.deepEqual(layout.routeBetweenLevels(onDeck, fromGround).at(-1), fromGround);
  assert.deepEqual(layout.routeBetweenLevels(layout.crewPlacement["crew-derrick"], fromGround), []);
});