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