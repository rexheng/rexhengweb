// Mechanica mesh — one sprite that holds the whole toolbox ring.
//
// Structure:
//   root ("mechanica_mesh")       ← spawn() offsets this onto the floor
//     └─ stage                    ← only the current part's pivot is attached
//          └─ pivot (at the part's base centre)   ← morph spins/scales this
//               └─ yaw group (display three-quarter turn)
//                    └─ part model (bottom at y=0, xz-centred)
//
// All six parts are built up front and kept on `root._morph.parts`; the
// `morph` ability (src/projects/abilities/morph.js) spins the current pivot
// out, swaps in the next one and spins it to rest. Detached parts are kept
// for reuse, so cycling never allocates or disposes geometry.
//
// GLB parts (wheel, axle, spanner) come from modelCache.mechanica, preloaded
// by src/projects/assets.js from the def's `fbx` field. Each named node is
// cloned and re-skinned onto per-instance palette materials.

import * as THREE from "three";
import { modelCache } from "../../assets.js";
import { decoupleMaterials } from "../../materialClone.mjs";
import {
  PARTS, makeMaterials, roleForBakedMaterial,
  buildEngine, buildGear, buildPiston,
} from "./parts.js";

const PROCEDURAL = { engine: buildEngine, gear: buildGear, piston: buildPiston };

// Orientation fixes applied to each GLB node before normalising, so every
// part ends up with its long axis / show face where PARTS expects it.
const GLB_ORIENT = {
  wheel:   (o) => { o.scale.set(0.72, 1, 1); },   // slimmer, bike-like tyre
  axle:    (o) => { o.rotation.y = Math.PI / 2; }, // shaft runs along z
  // On its edge so the camera sees the jaw + ring profile, not a sliver.
  spanner: (o) => { o.rotation.z = Math.PI / 2; },
};

function meshBox(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let any = false;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const b = new THREE.Box3().setFromObject(o);
    if (!Number.isFinite(b.min.x)) return;
    if (any) box.union(b); else { box.copy(b); any = true; }
  });
  return any ? box : null;
}

function glbPart(id, M) {
  const cached = modelCache.mechanica;
  const node = cached?.getObjectByName(id);
  if (!node) return null;
  const clone = node.clone(true);
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0, 0);
  clone.scale.set(1, 1, 1);
  clone.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    o.material = M[roleForBakedMaterial(id, src)];
  });
  GLB_ORIENT[id]?.(clone);
  const g = new THREE.Group();
  g.add(clone);
  return g;
}

// Scale `model` so its largest extent is `size`, sit it on y=0, centre xz,
// then wrap it in yaw + pivot groups. The pivot's origin is the part's base
// centre, so morph's spin turns it about its own vertical axis and its scale
// settle keeps the base on the floor. Returns the pivot.
function mountPart(model, spec) {
  const box0 = meshBox(model);
  if (box0) {
    const ext = box0.getSize(new THREE.Vector3());
    const longest = Math.max(ext.x, ext.y, ext.z);
    if (longest > 0) model.scale.multiplyScalar(spec.size / longest);
  }
  const box = meshBox(model);
  if (box) {
    const c = box.getCenter(new THREE.Vector3());
    model.position.x -= c.x;
    model.position.z -= c.z;
    model.position.y -= box.min.y;
  }

  const yaw = new THREE.Group();
  yaw.rotation.y = spec.yaw;
  yaw.add(model);

  const pivot = new THREE.Group();
  pivot.name = `mechanica_part_${spec.id}`;
  pivot.add(yaw);
  return pivot;
}

export function buildMesh() {
  const M = makeMaterials(THREE);
  const root = new THREE.Group();
  root.name = "mechanica_mesh";
  const stage = new THREE.Group();
  stage.name = "mechanica_stage";
  root.add(stage);

  const parts = [];
  for (const spec of PARTS) {
    const model = spec.source === "glb" ? glbPart(spec.id, M) : PROCEDURAL[spec.id](THREE, M);
    if (!model) continue;  // GLB failed to preload — skip that part, keep the ring
    parts.push({ id: spec.id, name: spec.name, pivot: mountPart(model, spec) });
  }
  // Each instance already owns fresh palette materials; decoupling the
  // detached parts too keeps the "no shared materials across clones" rule
  // explicit for every part, attached or not.
  for (const p of parts) decoupleMaterials(p.pivot);

  if (parts.length) stage.add(parts[0].pivot);
  root._morph = { parts, index: 0, stage, active: false, queued: 0 };
  return root;
}
