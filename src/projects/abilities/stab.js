// Stab ability — pre-rotation + fast lunge + contact-reactive torso knockback.
//
// Ported from the physics-agent rewrite on mujoco-portfolio (commit 010a20b,
// "Fix physics explosion, add persistent pin + stab knockback + starfield").
// The post-rewrite behaviour is: sprite rotates to face the torso, lunges at
// 22 m/s with a forward tumble, and on first contact with any humanoid body
// writes a cinematic knockback directly to the torso's qvel so the whole
// ragdoll pinwheels back. Without this scripted second stage a 2.5 kg prop
// contact gets absorbed by the articulated chain and barely moves the 41 kg
// humanoid.

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
  // THREE → MJ: (x, y, z)_three → (x, -z, y)_mj.
  const dirT = torsoPos.clone().sub(slotPos).normalize();
  const mjDx = dirT.x;
  const mjDy = -dirT.z;
  const mjDz = dirT.y;

  const model = app.model, data = app.data;
  const jntAdr = model.body_jntadr[slot.bodyID];
  const qposAdr = model.jnt_qposadr[jntAdr];
  const dofAdr = model.jnt_dofadr[jntAdr];

  // Rotate sprite to face the torso BEFORE the lunge fires. The mesh was
  // built in Three.js with the visor at local +z; the MuJoCo loader
  // swizzles such that local-MJ +y maps to local-THREE +z. So "visor
  // forward" in the body's MJ-local frame is +y. We need a quaternion
  // that rotates MJ-local +y onto the MJ-world target direction.
  const qTurn = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(mjDx, mjDy, mjDz),
  );
  // Three stores (x, y, z, w); MJ qpos stores (w, x, y, z). Convert.
  data.qpos[qposAdr + 3] = qTurn.w;
  data.qpos[qposAdr + 4] = qTurn.x;
  data.qpos[qposAdr + 5] = qTurn.y;
  data.qpos[qposAdr + 6] = qTurn.z;

  // Distance-calibrated lunge: stays in flight ~0.5s regardless of range.
  // Constant velocity made near-spawns feel like teleports; constant time
  // keeps the visual moment consistent. Clamp 8..22 m/s.
  const dist = torsoPos.distanceTo(slotPos);
  const TARGET_TIME = 0.5;
  const speed = Math.max(8, Math.min(22, dist / TARGET_TIME));

  // Upward bias scales with speed — short stabs don't get a giant lift.
  const upwardBias = 2.5 * (speed / 22);

  data.qvel[dofAdr + 0] = mjDx * speed;
  data.qvel[dofAdr + 1] = mjDy * speed;
  data.qvel[dofAdr + 2] = mjDz * speed + upwardBias;
  // Forward tumble: spin axis perpendicular to lunge direction.
  const perpAxisX = -mjDy;
  const perpAxisY = mjDx;
  data.qvel[dofAdr + 3] = perpAxisX * 18;
  data.qvel[dofAdr + 4] = perpAxisY * 18;
  data.qvel[dofAdr + 5] = (Math.random() - 0.5) * 6;

  // Flush the qpos write so mj_step sees the new orientation THIS frame.
  app.mujoco.mj_forward(model, data);

  // Collision-reactive second stage: watch for sprite geom touching any
  // humanoid body. On first contact, punch the torso with a direct qvel
  // impulse so the whole ragdoll flies back.
  const amogusGeoms = new Set();
  const humanoidGeoms = new Set();
  for (let g = 0; g < model.ngeom; g++) {
    const bid = model.geom_bodyid[g];
    if (bid === slot.bodyID) amogusGeoms.add(g);
    if (bid > 0) {
      const bodyGroup = app.bodies?.[bid];
      const name = bodyGroup?.name || "";
      if (!name.startsWith("project_slot_")) humanoidGeoms.add(g);
    }
  }

  let torsoBodyID = -1;
  for (const [id, g] of Object.entries(app.bodies || {})) {
    if (g?.name === "torso") { torsoBodyID = Number(id); break; }
  }
  if (torsoBodyID < 0) return { tick() { return false; } };
  const torsoJnt = model.body_jntadr[torsoBodyID];
  const torsoDof = torsoJnt >= 0 ? model.jnt_dofadr[torsoJnt] : -1;
  const torsoIsFree = torsoJnt >= 0 && model.jnt_type[torsoJnt] === 0;

  let hit = false;
  let timeoutMs = 1500;

  return {
    tick(dt) {
      if (hit) return false;
      timeoutMs -= dt;
      if (timeoutMs <= 0) return false;
      if (!torsoIsFree || torsoDof < 0) return false;

      const ncon = data.ncon;
      if (!ncon) return true;
      for (let i = 0; i < ncon; i++) {
        const c = data.contact.get(i);
        const g1 = c.geom1, g2 = c.geom2;
        const a1 = amogusGeoms.has(g1), h2 = humanoidGeoms.has(g2);
        const a2 = amogusGeoms.has(g2), h1 = humanoidGeoms.has(g1);
        if ((a1 && h2) || (a2 && h1)) {
          // Proportional to lunge speed so short-range stabs don't pinwheel
          // the humanoid as hard as long-range ones.
          const KNOCK_SPEED = 3.0 + (speed / 22) * 4.5;   // → 3.0..7.5
          data.qvel[torsoDof + 0] = mjDx * KNOCK_SPEED;
          data.qvel[torsoDof + 1] = mjDy * KNOCK_SPEED;
          data.qvel[torsoDof + 2] = mjDz * KNOCK_SPEED + 3.0;
          data.qvel[torsoDof + 3] = -mjDy * 6;
          data.qvel[torsoDof + 4] =  mjDx * 6;
          data.qvel[torsoDof + 5] = (Math.random() - 0.5) * 3;
          hit = true;
          return false;
        }
      }
      return true;
    },
  };
}
