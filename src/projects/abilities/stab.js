// Stab ability — one-shot lunge toward the humanoid torso with a spin.
// Ported from the pre-refactor src/projects.js stabAbility.

import * as THREE from "three";
import { findBody } from "./impulse.js";

export function stab({ app, slot }) {
  const torso = findBody(app, "torso");
  if (!torso) return { tick() { return false; } };

  const torsoPos = new THREE.Vector3();
  torso.updateWorldMatrix(true, false);
  torsoPos.setFromMatrixPosition(torso.matrixWorld);

  const slotPos = new THREE.Vector3();
  slot.group.updateWorldMatrix(true, false);
  slotPos.setFromMatrixPosition(slot.group.matrixWorld);

  // Direction from slot → torso in THREE world, swizzled to MJ world.
  // THREE → MJ: (x, y, z) → (x, -z, y).
  const dir = torsoPos.clone().sub(slotPos).normalize();
  const mjDx = dir.x;
  const mjDy = -dir.z;
  const mjDz = dir.y;

  // Impulse: fast lunge at ~14 m/s with a small upward bias + hefty spin.
  const model = app.model, data = app.data;
  const jntAdr = model.body_jntadr[slot.bodyID];
  const dofAdr = model.jnt_dofadr[jntAdr];
  const SPEED = 14.0;
  data.qvel[dofAdr + 0] = mjDx * SPEED;
  data.qvel[dofAdr + 1] = mjDy * SPEED;
  data.qvel[dofAdr + 2] = mjDz * SPEED + 2.5; // upward bias so it launches cleanly
  // Spin axis roughly perpendicular to lunge direction — tumble forward.
  const perpAxisX = -mjDy;
  const perpAxisY = mjDx;
  data.qvel[dofAdr + 3] = perpAxisX * 18;
  data.qvel[dofAdr + 4] = perpAxisY * 18;
  data.qvel[dofAdr + 5] = (Math.random() - 0.5) * 6;

  // One-shot impulse; no per-frame tick needed.
  return { tick() { return false; } };
}
