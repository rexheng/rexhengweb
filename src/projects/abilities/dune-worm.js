// Dune-worm train ability — Olympic Way summons a Bombardier S Stock
// train that bursts up from one scene edge, arcs through the playground,
// and dives back into the ground at the opposite edge, knocking down
// anything in its path. See spec §3.8.

import * as THREE from "three";
import { modelCache } from "../assets.js";
import { findBody } from "./impulse.js";

const TOTAL_MS = 3500;
const EMERGE_MS = 500;
const DIVE_MS = 500;
const ARC_PEAK_Y = 1.6;
const SUBTERRANEAN_Y = -1.0;
const EMERGE_Y = 0.4;
const HIT_COOLDOWN_MS = 200;

export function duneWorm({ app }) {
  const cached = modelCache.bombardier;
  if (!cached) {
    console.warn("[dune-worm] modelCache.bombardier missing — preload failed?");
    return { tick() { return false; } };
  }

  // Clone parented to scene root (not slot.group) so the train moves
  // through the world independently of the Olympic Way roundel sprite.
  const trainGroup = cached.clone(true);
  trainGroup.name = "dune_worm_train";
  app.scene.add(trainGroup);

  // Trajectory: pick one of two opposite scene-edge endpoints. Random
  // sign so successive fires alternate direction.
  const sign = Math.random() < 0.5 ? -1 : 1;
  const startPos = new THREE.Vector3(-4 * sign, SUBTERRANEAN_Y, 0);
  const emergePos = new THREE.Vector3(-4 * sign, EMERGE_Y, 0);
  const peakPos = new THREE.Vector3(0, ARC_PEAK_Y, 0);
  const overEdgePos = new THREE.Vector3(4 * sign, EMERGE_Y, 0);
  const endPos = new THREE.Vector3(4 * sign, SUBTERRANEAN_Y, 0);

  // Hit cooldown per humanoid body.
  const lastHitMs = new Map();

  // Velocity finite-difference state.
  const prevPos = trainGroup.position.clone();
  prevPos.copy(startPos);
  const trainBox = new THREE.Box3();
  const bodyBox = new THREE.Box3();
  const trainVel = new THREE.Vector3();

  let elapsed = 0;
  let disposed = false;

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (trainGroup.parent) trainGroup.parent.remove(trainGroup);
    trainGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose?.());
    });
  }

  return {
    tick(dtMs) {
      if (disposed) return false;
      elapsed += dtMs;
      if (elapsed >= TOTAL_MS) {
        dispose();
        return false;
      }

      // Phase calculation.
      let pos;
      let pitch = 0;        // rotation around the X axis (nose up/down)
      if (elapsed < EMERGE_MS) {
        // Emergence — ease-out lerp from start to emergePos.
        const t = elapsed / EMERGE_MS;
        const e = 1 - Math.pow(1 - t, 2);
        pos = startPos.clone().lerp(emergePos, e);
        pitch = (Math.PI / 3) * (1 - e);    // 60° → 0° as emergence completes
      } else if (elapsed < TOTAL_MS - DIVE_MS) {
        // Arc — parabola through peakPos.
        const t = (elapsed - EMERGE_MS) / (TOTAL_MS - EMERGE_MS - DIVE_MS);
        // Quadratic Bezier through emerge, peak, overEdge.
        const omt = 1 - t;
        pos = new THREE.Vector3()
          .addScaledVector(emergePos, omt * omt)
          .addScaledVector(peakPos, 2 * omt * t)
          .addScaledVector(overEdgePos, t * t);
      } else {
        // Dive — mirrored emergence.
        const t = (elapsed - (TOTAL_MS - DIVE_MS)) / DIVE_MS;
        const e = t * t;
        pos = overEdgePos.clone().lerp(endPos, e);
        pitch = -(Math.PI / 3) * e;
      }

      trainGroup.position.copy(pos);

      // Pitch + heading. Heading = atan2 of velocity (xz).
      const dx = pos.x - prevPos.x;
      const dz = pos.z - prevPos.z;
      const heading = Math.atan2(-dx, -dz);    // facing motion direction
      trainGroup.rotation.set(pitch, heading, 0, "YXZ");

      // Velocity for knockback (THREE frame).
      const dtSec = Math.max(0.0001, dtMs / 1000);
      trainVel.subVectors(pos, prevPos).divideScalar(dtSec);
      prevPos.copy(pos);

      // Bbox-vs-bbox knockback on humanoid root only.
      trainGroup.updateMatrixWorld(true);
      trainBox.setFromObject(trainGroup);
      const torsoBody = findBody(app, "torso");
      if (torsoBody && app.model && app.data) {
        // Find torso bodyID via scan (mirrors stab.js's pattern).
        let torsoBodyID = -1;
        for (const [id, g] of Object.entries(app.bodies || {})) {
          if (g?.name === "torso") { torsoBodyID = Number(id); break; }
        }
        if (torsoBodyID > 0) {
          const torsoGroup = app.bodies[torsoBodyID];
          torsoGroup.updateWorldMatrix(true, false);
          bodyBox.setFromObject(torsoGroup);
          const last = lastHitMs.get(torsoBodyID) ?? -Infinity;
          if (trainBox.intersectsBox(bodyBox) && performance.now() - last > HIT_COOLDOWN_MS) {
            lastHitMs.set(torsoBodyID, performance.now());
            const torsoJnt = app.model.body_jntadr[torsoBodyID];
            const torsoIsFree = torsoJnt >= 0 && app.model.jnt_type[torsoJnt] === 0;
            if (torsoIsFree) {
              const torsoDof = app.model.jnt_dofadr[torsoJnt];
              // THREE → MJ swizzle: (x, y, z)_three → (x, -z, y)_mj.
              const mjVx = trainVel.x;
              const mjVy = -trainVel.z;
              const mjVz = trainVel.y;
              app.data.qvel[torsoDof + 0] = mjVx * 0.6;
              app.data.qvel[torsoDof + 1] = mjVy * 0.6;
              app.data.qvel[torsoDof + 2] = 6.0;
              app.data.qvel[torsoDof + 3] = (Math.random() - 0.5) * 8;
              app.data.qvel[torsoDof + 4] = (Math.random() - 0.5) * 8;
              app.data.qvel[torsoDof + 5] = (Math.random() - 0.5) * 8;
            }
          }
        }
      }

      return true;
    },
    cancel() { dispose(); },
  };
}
