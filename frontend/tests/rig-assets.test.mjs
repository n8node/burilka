import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import * as THREE from "three";

function glb(name) {
  const b = readFileSync(new URL(`../public/rig-glb/${name}`, import.meta.url));
  return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString("utf8"));
}

test("rotary table and slips are separate GLB meshes", () => {
  const source = readFileSync(new URL("../src/lib/rig-kinematics.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function("exports", "require", compiled)(exports, (name) => name === "three" ? {} : undefined);
  const { table, slips } = exports.ROTARY_PARTS;
  const nodes = glb("01_classic_rig/rotary.glb").nodes;
  assert.equal(new Set([...table, ...slips]).size, table.length + slips.length);
  for (const name of [...table, ...slips]) assert.ok(nodes.some((node, index) => node.mesh !== undefined && `mesh_${index}` === name), `missing ${name}`);
  assert.deepEqual(table, ["mesh_1", "mesh_2"]);
  assert.deepEqual(slips, ["mesh_4", "mesh_5", "mesh_6"]);
});

test("cementing fleet is not a drilling aggregate", () => {
  assert.ok(glb("01_classic_rig/cementFleet.glb").meshes.length > 50);
  const source = readFileSync(new URL("../src/components/admin/ClassicRigSceneViewer.tsx", import.meta.url), "utf8");
  assert.match(source, /id === "cementFleet"\) gltf\.scene\.visible = false/);
  assert.doesNotMatch(source, /id === "camp-vehicles"\) \{ gltf\.scene\.position/);
});

test("kinematics rotates the table but never turns the slips with the pipe", () => {
  const source = readFileSync(new URL("../src/lib/rig-kinematics.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function("exports", "require", compiled)(exports, (name) => name === "three" ? THREE : undefined);
  const rotary = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2));
    mesh.name = `mesh_${i}`;
    mesh.position.set(i > 3 ? 0.6 : 0, 8.7, i > 3 ? 0.5 : 0);
    rotary.add(mesh);
  }
  const roots = new Map([["rotary", rotary]]);
  const apply = exports.createRigKinematics(roots);
  const slips = exports.ROTARY_PARTS.slips.map((name) => rotary.getObjectByName(name));
  apply({ rotaryAngle: Math.PI / 2, slipsClosed: false, height: 0, driveAngle: 0 });
  const before = slips.map((mesh) => mesh.getWorldPosition(new THREE.Vector3()));
  apply({ rotaryAngle: Math.PI, slipsClosed: false, height: 0, driveAngle: Math.PI });
  slips.forEach((mesh, index) => {
    assert.ok(mesh.getWorldPosition(new THREE.Vector3()).distanceTo(before[index]) < 1e-6);
    assert.equal(mesh.rotation.y, 0);
  });
  const table = rotary.getObjectByName("mesh_1");
  assert.ok(table.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3()) > 0);
});

test("stand and pump parts are individually exported in the rig assets", () => {
  const source = readFileSync(new URL("../src/lib/rig-kinematics.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function("exports", "require", compiled)(exports, (name) => name === "three" ? THREE : undefined);
  const rack = glb("01_classic_rig/setback.glb");
  assert.ok(rack.nodes[13].mesh !== undefined);
  const pumps = glb("01_classic_rig/mudpumps.glb");
  for (const part of exports.PUMP_PARTS) {
    for (const name of [...part.cylinders, part.crank]) {
      assert.ok(pumps.nodes.some((node, index) => node.mesh !== undefined && `mesh_${index}` === name), name);
    }
  }
  const standNode = rack.nodes[13];
  assert.ok(standNode.matrix || standNode.translation);
  const pipe = glb("01_classic_rig/drillstring.glb").nodes[0].matrix;
  assert.ok(Math.abs(pipe[12]) < 0.01 && Math.abs(pipe[14]) < 0.01, "drillstring must be on the well axis");
  assert.ok(pipe[5] > 30, "drillstring should be vertical");
});

test("stand moves without dragging setback and pump bodies stay fixed", () => {
  const source = readFileSync(new URL("../src/lib/rig-kinematics.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function("exports", "require", compiled)(exports, (name) => name === "three" ? THREE : undefined);
  const rack = new THREE.Group();
  const pumps = new THREE.Group();
  for (let i = 0; i < 47; i++) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1)); mesh.name = `mesh_${i}`; mesh.position.set(i === 13 ? 3.2 : 5, i === 13 ? 20.9 : 8, 0); rack.add(mesh); }
  for (let i = 0; i < 56; i++) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1)); mesh.name = `mesh_${i}`; mesh.position.set(0, 1, i); pumps.add(mesh); }
  const apply = exports.createRigKinematics(new Map([["setback", rack], ["mudpumps", pumps]]));
  const parked = { visible: true, x: 3.2, y: 20.9, z: 0, rotation: 0 };
  const base = { height: 0, slipsClosed: false, driveAngle: 0, rotaryAngle: 0, pumpAngle: 0, stand: parked };
  apply(base);
  const stand = rack.getObjectByName("mesh_13");
  const staticRack = rack.getObjectByName("mesh_0").getWorldPosition(new THREE.Vector3());
  const staticPump = pumps.getObjectByName("mesh_1").getWorldPosition(new THREE.Vector3());
  apply({ ...base, pumpAngle: Math.PI / 2, stand: { ...parked, x: 0, y: 22.1 } });
  assert.ok(stand.position.distanceTo(new THREE.Vector3(0, 22.1, 0)) < 1e-6);
  assert.ok(rack.getObjectByName("mesh_0").getWorldPosition(new THREE.Vector3()).distanceTo(staticRack) < 1e-6);
  assert.ok(pumps.getObjectByName("mesh_1").getWorldPosition(new THREE.Vector3()).distanceTo(staticPump) < 1e-6);
  const cylinder = pumps.getObjectByName("mesh_6");
  const stopped = cylinder.position.z;
  apply({ ...base, pumpAngle: Math.PI / 2, stand: { ...parked, visible: false } });
  assert.equal(cylinder.position.z, stopped);
  assert.equal(stand.visible, false);
});