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
import {
  computeBallisticLunge,
  shouldTriggerNearContact,
} from "./stabPhysics.mjs";

const TARGET_BODY_OFFSET_Y = 0.06;
const STAB_TIMEOUT_MS = 1500;

function threeToMjPos(v) {
  return { x: v.x, y: -v.z, z: v.y };
}

function mjToThreePos(p) {
  return new THREE.Vector3(p.x, p.z, -p.y);
}

export function stab({ app, slot }) {
  const torso = findBody(app, "torso");
  if (!torso) return { tick() { return false; } };

  const torsoPos = new THREE.Vector3();
  const targetPos = new THREE.Vector3();
  torso.updateWorldMatrix(true, false);
  torsoPos.setFromMatrixPosition(torso.matrixWorld);
  targetPos.copy(torsoPos);
  targetPos.y += TARGET_BODY_OFFSET_Y;

  const slotPos = new THREE.Vector3();
  slot.group.updateWorldMatrix(true, false);
  slotPos.setFromMatrixPosition(slot.group.matrixWorld);

  const model = app.model, data = app.data;
  const jntAdr = model.body_jntadr[slot.bodyID];
  const qposAdr = model.jnt_qposadr[jntAdr];
  const dofAdr = model.jnt_dofadr[jntAdr];

  const slotMj = threeToMjPos(slotPos);
  const targetMj = threeToMjPos(targetPos);
  const lunge = computeBallisticLunge({
    from: slotMj,
    to: targetMj,
    gravityZ: model.opt?.gravity?.[2] ?? -9.81,
  });
  const horizontalMag = Math.hypot(lunge.vx, lunge.vy) || 1;
  const mjDx = lunge.vx / horizontalMag;
  const mjDy = lunge.vy / horizontalMag;

  // Rotate sprite to face the torso BEFORE the lunge fires. The mesh was
  // built in Three.js with the visor at local +z; the MuJoCo loader
  // swizzles such that local-MJ +y maps to local-THREE +z. So "visor
  // forward" in the body's MJ-local frame is +y. Rotate toward the initial
  // ballistic velocity so the visor follows the arc instead of a flat ray.
  const flightDir = new THREE.Vector3(lunge.vx, lunge.vy, lunge.vz).normalize();
  const qTurn = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    flightDir,
  );
  // Three stores (x, y, z, w); MJ qpos stores (w, x, y, z). Convert.
  data.qpos[qposAdr + 3] = qTurn.w;
  data.qpos[qposAdr + 4] = qTurn.x;
  data.qpos[qposAdr + 5] = qTurn.y;
  data.qpos[qposAdr + 6] = qTurn.z;

  data.qvel[dofAdr + 0] = lunge.vx;
  data.qvel[dofAdr + 1] = lunge.vy;
  data.qvel[dofAdr + 2] = lunge.vz;
  // Forward tumble: spin axis perpendicular to lunge direction.
  const perpAxisX = -mjDy;
  const perpAxisY = mjDx;
  data.qvel[dofAdr + 3] = perpAxisX * 14;
  data.qvel[dofAdr + 4] = perpAxisY * 14;
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
  let timeoutMs = STAB_TIMEOUT_MS;
  let elapsedMs = 0;

  function readCurrentTargetMj() {
    torso.updateWorldMatrix(true, false);
    torsoPos.setFromMatrixPosition(torso.matrixWorld);
    targetPos.copy(torsoPos);
    targetPos.y += TARGET_BODY_OFFSET_Y;
    return threeToMjPos(targetPos);
  }

  function readCurrentSlotMj() {
    slot.group.updateWorldMatrix(true, false);
    slotPos.setFromMatrixPosition(slot.group.matrixWorld);
    return threeToMjPos(slotPos);
  }

  function applyHit(hitPosThree) {
    const power = Math.max(0, Math.min(1, (lunge.horizontalSpeed - 5) / 9));
    const knockSpeed = 3.2 + power * 3.8;
    data.qvel[torsoDof + 0] = mjDx * knockSpeed;
    data.qvel[torsoDof + 1] = mjDy * knockSpeed;
    data.qvel[torsoDof + 2] = 2.4 + power * 1.2;
    data.qvel[torsoDof + 3] = -mjDy * 5;
    data.qvel[torsoDof + 4] =  mjDx * 5;
    data.qvel[torsoDof + 5] = (Math.random() - 0.5) * 2.4;
    app.sparks?.burst({
      pos: hitPosThree,
      color: "#c51111",
      count: 18,
      ttlMs: 700,
    });
    hit = true;
    return false;
  }

  return {
    tick(dt) {
      if (hit) return false;
      elapsedMs += dt;
      timeoutMs -= dt;
      if (timeoutMs <= 0) return false;
      if (!torsoIsFree || torsoDof < 0) return false;

      const ncon = data.ncon;
      if (ncon) {
        for (let i = 0; i < ncon; i++) {
          const c = data.contact.get(i);
          const g1 = c.geom1, g2 = c.geom2;
          const a1 = amogusGeoms.has(g1), h2 = humanoidGeoms.has(g2);
          const a2 = amogusGeoms.has(g2), h1 = humanoidGeoms.has(g1);
          if ((a1 && h2) || (a2 && h1)) {
            // Blood spray at contact point. MJ→THREE swizzle: (x, y, z)_mj
            // → (x, z, -y)_three. Inverse of the THREE→MJ swizzle used for
            // velocity above.
            const contactPos = new THREE.Vector3(c.pos[0], c.pos[2], -c.pos[1]);
            return applyHit(contactPos);
          }
        }
      }

      const currentTargetMj = readCurrentTargetMj();
      const currentSlotMj = readCurrentSlotMj();
      if (shouldTriggerNearContact({
        elapsedMs,
        slotPos: currentSlotMj,
        targetPos: currentTargetMj,
      })) {
        return applyHit(mjToThreePos(currentSlotMj));
      }

      return true;
    },
  };
}
