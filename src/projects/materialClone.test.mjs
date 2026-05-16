import assert from "node:assert/strict";
import test from "node:test";

import { decoupleMaterials } from "./materialClone.mjs";

// Minimal fake matching the THREE surface decoupleMaterials touches.
let nextId = 1;
function mat() {
  const m = { id: nextId++, emissive: 0 };
  m.clone = () => ({ ...m, id: nextId++, clone: m.clone });
  return m;
}
function mesh(material) {
  return { isMesh: true, material };
}
function group(children) {
  return {
    children,
    traverse(fn) {
      fn(this);
      for (const c of children) c.traverse ? c.traverse(fn) : fn(c);
    },
  };
}

test("each mesh gets a fresh material instance, prototype untouched", () => {
  const shared = mat();
  const proto = group([mesh(shared), mesh(shared)]);
  const inst = decoupleMaterials(group([mesh(shared), mesh(shared)]));

  // Prototype material identity is preserved.
  assert.equal(proto.children[0].material, shared);
  // Cloned instance no longer references the prototype's material.
  assert.notEqual(inst.children[0].material, shared);
  assert.notEqual(inst.children[1].material, shared);
});

test("intra-tree material sharing is preserved within an instance", () => {
  const shared = mat();
  const inst = decoupleMaterials(group([mesh(shared), mesh(shared)]));
  // Both meshes shared one material in the prototype -> one clone here.
  assert.equal(inst.children[0].material, inst.children[1].material);
});

test("two instances do not share materials (the hover bug)", () => {
  const shared = mat();
  const a = decoupleMaterials(group([mesh(shared)]));
  const b = decoupleMaterials(group([mesh(shared)]));
  assert.notEqual(a.children[0].material, b.children[0].material);

  // Mutating instance A's material must not affect instance B.
  a.children[0].material.emissive = 1;
  assert.equal(b.children[0].material.emissive, 0);
});

test("array (multi-) materials are each cloned", () => {
  const m1 = mat();
  const m2 = mat();
  const inst = decoupleMaterials(group([mesh([m1, m2])]));
  assert.notEqual(inst.children[0].material[0], m1);
  assert.notEqual(inst.children[0].material[1], m2);
  assert.notEqual(inst.children[0].material[0], inst.children[0].material[1]);
});
