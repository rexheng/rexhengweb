// Topple ability — one-shot rotational impulse that fells a tall sprite
// like a cut tree. Reusable for any tall project (lighthouses, statues, …).
//
// Picks a horizontal "forward" axis based on the slot's current facing,
// applies a rotational kick perpendicular to that axis, and adds a small
// horizontal nudge so the falling top arcs away from the vertical.

import * as THREE from "three";
import { findBody } from "./impulse.js";

export function topple({ app, slot }) {
  const torso = findBody(app, "torso");

  // Determine a horizontal "away" direction in MJ space. If the humanoid's
  // torso is findable, fall away from it (so the column crashes toward the
  // player rather than into the humanoid's face — more satisfying). Else
  // pick a random horizontal.
  let awayX = 0, awayY = 0;
  if (torso) {
    const torsoPos = new THREE.Vector3();
    torso.updateWorldMatrix(true, false);
    torsoPos.setFromMatrixPosition(torso.matrixWorld);
    const slotPos = new THREE.Vector3();
    slot.group.updateWorldMatrix(true, false);
    slotPos.setFromMatrixPosition(slot.group.matrixWorld);
    const dir = slotPos.clone().sub(torsoPos);
    // THREE → MJ: (x, y, z) → (x, -z, y). The horizontal "away" direction
    // in MJ space uses the THREE-x and THREE-(-z) components.
    awayX = dir.x;
    awayY = -dir.z;
    const mag = Math.hypot(awayX, awayY);
    if (mag > 1e-6) {
      awayX /= mag;
      awayY /= mag;
    } else {
      const theta = Math.random() * Math.PI * 2;
      awayX = Math.cos(theta);
      awayY = Math.sin(theta);
    }
  } else {
    const theta = Math.random() * Math.PI * 2;
    awayX = Math.cos(theta);
    awayY = Math.sin(theta);
  }

  // The rotation axis is perpendicular to `away` in the MJ horizontal plane
  // — `(−awayY, awayX, 0)` — so the column pitches over in the `away`
  // direction (positive angular velocity about the perpendicular axis
  // topples it forward).
  const rotAxisX = -awayY;
  const rotAxisY =  awayX;

  const SPIN = 7.5;   // rad/s — stronger = faster topple
  const NUDGE = 0.6;  // m/s — small horizontal kick so the fall isn't purely rotational

  const model = app.model, data = app.data;
  const jntAdr = model.body_jntadr[slot.bodyID];
  const dofAdr = model.jnt_dofadr[jntAdr];
  data.qvel[dofAdr + 0] = awayX * NUDGE;
  data.qvel[dofAdr + 1] = awayY * NUDGE;
  data.qvel[dofAdr + 2] = 0;
  data.qvel[dofAdr + 3] = rotAxisX * SPIN;
  data.qvel[dofAdr + 4] = rotAxisY * SPIN;
  data.qvel[dofAdr + 5] = (Math.random() - 0.5) * 0.4;

  return { tick() { return false; } };
}
