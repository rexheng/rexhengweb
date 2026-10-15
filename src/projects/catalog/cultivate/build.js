// Cultivate mesh — clone of the preloaded 1903 Wright Flyer GLB (Smithsonian
// NASM scan, CC0; see REFS.md). The GLB carries two hub-pivoted propeller
// nodes, "prop_L" and "prop_R", which the fly ability spins about local Z.

import * as THREE from "three";
import { modelCache } from "../../assets.js";
import { decoupleMaterials } from "../../materialClone.mjs";

// The Flyer is mostly air: muslin wings, thin struts and wires. Raycasts
// against the rendered meshes slip through the gaps, so hovering, grabbing
// and double-clicking it would be fiddly. An invisible box over its bounds
// (raycasts ignore material.visible) gives it the same solid click target
// every other sprite has. It sits exactly on the mesh bounds, so the spawn
// hitbox auto-derive is unchanged.
const proxyGeometry = new WeakMap();   // cached prototype → BoxGeometry (prototype-local)

function meshBoundsLocal(root) {
  const saved = [root.position.clone(), root.quaternion.clone(), root.scale.clone()];
  root.position.set(0, 0, 0);
  root.quaternion.identity();
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((o) => { if (o.isMesh && o.geometry) box.expandByObject(o); });
  root.position.copy(saved[0]);
  root.quaternion.copy(saved[1]);
  root.scale.copy(saved[2]);
  root.updateMatrixWorld(true);
  return box;
}

function hitProxy(prototype) {
  let geom = proxyGeometry.get(prototype);
  if (!geom) {
    const box = meshBoundsLocal(prototype);
    if (box.isEmpty()) return null;
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    geom = new THREE.BoxGeometry(size.x, size.y, size.z).translate(centre.x, centre.y, centre.z);
    proxyGeometry.set(prototype, geom);
  }
  const proxy = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ visible: false }));
  proxy.name = "hit_proxy";
  proxy.castShadow = false;
  proxy.receiveShadow = false;
  return proxy;
}

export function buildMesh() {
  const cached = modelCache.cultivate;
  if (!cached) return new THREE.Group();   // graceful fallback on load failure
  // clone(true) shares materials with the prototype and every sibling clone;
  // decoupleMaterials gives this instance its own so the hover tint doesn't
  // bleed across every spawned Flyer.
  const root = decoupleMaterials(cached.clone(true));
  const proxy = hitProxy(cached);
  if (proxy) root.add(proxy);
  return root;
}
