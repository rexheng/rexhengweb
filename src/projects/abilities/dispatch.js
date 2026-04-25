// Dispatch ability — paper-plane scratch mesh lerps from the sprite to the
// humanoid torso. Used by ClearPath. The plane is parented to the scene
// (NOT slot.group) so it doesn't move with a tumbling sprite. On arrival or
// after DURATION, geometry + material are disposed.

import * as THREE from "three";
import { findBody } from "./impulse.js";

const DURATION_MS = 1500;
const ARRIVAL_DIST = 0.25;

export function dispatch({ app, slot }) {
  const torso = findBody(app, "torso");
  if (!torso) return { tick() { return false; } };

  // Find the scene root by walking up from the slot group.
  let sceneRoot = slot.group;
  while (sceneRoot && !sceneRoot.isScene) sceneRoot = sceneRoot.parent;
  if (!sceneRoot) sceneRoot = app.scene;
  if (!sceneRoot) return { tick() { return false; } };

  const geom = new THREE.PlaneGeometry(0.12, 0.16);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f8f8f8"),
    emissive: new THREE.Color("#ffffff"),
    emissiveIntensity: 0.45,
    roughness: 0.6,
    metalness: 0.0,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(geom, mat);
  plane.castShadow = false;
  plane.receiveShadow = false;

  // Start at the slot's current world position.
  const startPos = new THREE.Vector3();
  slot.group.updateWorldMatrix(true, false);
  startPos.setFromMatrixPosition(slot.group.matrixWorld);
  plane.position.copy(startPos);
  sceneRoot.add(plane);

  let elapsed = 0;
  let disposed = false;
  const targetPos = new THREE.Vector3();
  const lerped = new THREE.Vector3();

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (plane.parent) plane.parent.remove(plane);
    geom.dispose();
    mat.dispose();
  }

  return {
    tick(dtMs) {
      if (disposed) return false;
      elapsed += dtMs;
      const t = Math.min(1, elapsed / DURATION_MS);

      torso.updateWorldMatrix(true, false);
      targetPos.setFromMatrixPosition(torso.matrixWorld);

      // Ease toward the (continually re-sampled) torso position.
      const eased = 1 - Math.pow(1 - t, 3);
      lerped.copy(startPos).lerp(targetPos, eased);
      plane.position.copy(lerped);

      // Orient the plane to face its travel direction.
      plane.lookAt(targetPos);

      // Fade in the last 25%.
      mat.opacity = t < 0.75 ? 1 : Math.max(0, 1 - (t - 0.75) / 0.25);

      const dist = plane.position.distanceTo(targetPos);
      if (dist < ARRIVAL_DIST || t >= 1) {
        dispose();
        return false;
      }
      return true;
    },
    cancel() { dispose(); },
  };
}
