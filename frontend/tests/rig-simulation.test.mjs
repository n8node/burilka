import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/rig-simulation.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exports = {};
new Function("exports", compiled)(exports);
const { RigSimulation, drillingSteps } = exports;

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