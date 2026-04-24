// Persistent per-body pin. Press F to lock a body in world space; the pin
// survives mouse release. Multiple independent pins can coexist. Unpin by
// click-dragging the pinned body past a small cursor threshold, or by
// tapping F while hovering it.
//
// Two mechanisms:
//   - Freejoint bodies (jnt_type === 0): directly overwrite qpos/qvel each
//     frame. Same rigid freeze the old grabber used, just persistent and
//     per-body.
//   - Articulated limbs: apply a stiff critically-damped spring force via
//     xfrc_applied that holds the body's CoM at its captured world pose,
//     plus torque toward captured orientation. The rest of the kinematic
//     chain swings freely from the pinned link.
//
// MuJoCo frames: qpos/cvel/xfrc_applied are in MJ world (z-up). xpos/xquat
// arrays that the Three.js loader reads are also MJ world; the loader
// swizzles to THREE on the fly. This module stays in MJ space throughout.

// Articulated-limb spring: stiff enough to hold against gravity + other
// limbs pulling on the pinned body via joints.
const ART_OMEGA = 25.0;
const ART_ZETA = 1.0;
// Force cap per pinned body. Articulated limbs rarely exceed a few kg so
// 500 N is plenty to hold them still under any realistic perturbation.
const ART_FORCE_CAP = 500;
const ART_TORQUE_CAP = 50;

export class PinSystem {
  constructor(app) {
    this.app = app;
    // bodyID -> { mjPos: [3], mjQuat: [4] }
    // Visual tinting of pinned bodies is handled by hoverHighlight so that
    // emissive tints don't fight each other when a user hovers or grabs a
    // pinned body. This class is purely about physics.
    this.pins = new Map();
  }

  isPinned(bodyID) {
    return this.pins.has(bodyID);
  }

  togglePin(bodyID) {
    if (this.isPinned(bodyID)) this.unpin(bodyID);
    else this.pin(bodyID);
  }

  pin(bodyID) {
    if (bodyID <= 0) return;          // world body / invalid
    if (this.isPinned(bodyID)) return;
    const data = this.app.data;
    if (!data) return;
    // Capture current MJ-world pose straight from data.xpos / data.xquat.
    const mjPos = [
      data.xpos[bodyID * 3 + 0],
      data.xpos[bodyID * 3 + 1],
      data.xpos[bodyID * 3 + 2],
    ];
    const mjQuat = [
      data.xquat[bodyID * 4 + 0],
      data.xquat[bodyID * 4 + 1],
      data.xquat[bodyID * 4 + 2],
      data.xquat[bodyID * 4 + 3],
    ];
    this.pins.set(bodyID, { mjPos, mjQuat });
  }

  unpin(bodyID) {
    this.pins.delete(bodyID);
  }

  clearAll() {
    for (const bodyID of Array.from(this.pins.keys())) this.unpin(bodyID);
  }

  // Called every frame BEFORE stepPhysics, AFTER grabber.apply().
  apply() {
    if (!this.pins.size) return;
    // Suspend while replay is scrubbing qpos directly — pin spring would
    // fight playback for one frame every tick and jitter the scrubbed pose.
    if (this.app.replay?.active) return;

    const data = this.app.data;
    const model = this.app.model;
    if (!data || !model) return;

    for (const [bodyID, entry] of this.pins) {
      const jntAdr = model.body_jntadr?.[bodyID];
      const jntType = (jntAdr !== undefined && jntAdr >= 0)
        ? model.jnt_type?.[jntAdr]
        : -1;

      if (jntType === 0) {
        // Freejoint: overwrite qpos (3 pos + 4 quat) and zero qvel (6).
        const qposAdr = model.jnt_qposadr[jntAdr];
        const dofAdr = model.jnt_dofadr[jntAdr];
        data.qpos[qposAdr + 0] = entry.mjPos[0];
        data.qpos[qposAdr + 1] = entry.mjPos[1];
        data.qpos[qposAdr + 2] = entry.mjPos[2];
        data.qpos[qposAdr + 3] = entry.mjQuat[0];
        data.qpos[qposAdr + 4] = entry.mjQuat[1];
        data.qpos[qposAdr + 5] = entry.mjQuat[2];
        data.qpos[qposAdr + 6] = entry.mjQuat[3];
        for (let k = 0; k < 6; k++) data.qvel[dofAdr + k] = 0;
        continue;
      }

      // Articulated body: apply stiff spring toward captured pose via xfrc.
      // xfrc_applied layout: [fx fy fz tx ty tz] in MJ world, applied at CoM.
      const off6 = bodyID * 6;
      const mass = Math.max(0.01, model.body_mass?.[bodyID] ?? 1.0);
      const k = ART_OMEGA * ART_OMEGA * mass;
      const c = 2 * ART_ZETA * ART_OMEGA * mass;

      // Position error (MJ world).
      const dx = entry.mjPos[0] - data.xpos[bodyID * 3 + 0];
      const dy = entry.mjPos[1] - data.xpos[bodyID * 3 + 1];
      const dz = entry.mjPos[2] - data.xpos[bodyID * 3 + 2];

      // Linear velocity (cvel[body*6 + 3..5] is linear in MJ world).
      const vLx = data.cvel?.[off6 + 3] ?? 0;
      const vLy = data.cvel?.[off6 + 4] ?? 0;
      const vLz = data.cvel?.[off6 + 5] ?? 0;

      let fx = k * dx - c * vLx;
      let fy = k * dy - c * vLy;
      let fz = k * dz - c * vLz;
      const fmag = Math.hypot(fx, fy, fz);
      if (fmag > ART_FORCE_CAP) {
        const s = ART_FORCE_CAP / fmag;
        fx *= s; fy *= s; fz *= s;
      }

      // Orientation error: qErr = qTarget * conj(qCurrent), then rotation
      // vector ≈ 2 * vec_part for small angles; use that as the torque
      // proportional term. MJ quat layout is [w, x, y, z] — confirmed
      // against mujocoLoader.getQuaternion which reads buffer[0] as w.
      const mjCW = data.xquat[bodyID * 4 + 0];
      const mjCX = data.xquat[bodyID * 4 + 1];
      const mjCY = data.xquat[bodyID * 4 + 2];
      const mjCZ = data.xquat[bodyID * 4 + 3];
      const mjTW = entry.mjQuat[0];
      const mjTX = entry.mjQuat[1];
      const mjTY = entry.mjQuat[2];
      const mjTZ = entry.mjQuat[3];
      // qErr = qTarget * conj(qCurrent)
      const ciW =  mjCW;
      const ciX = -mjCX;
      const ciY = -mjCY;
      const ciZ = -mjCZ;
      const eW = mjTW * ciW - mjTX * ciX - mjTY * ciY - mjTZ * ciZ;
      let eX = mjTW * ciX + mjTX * ciW + mjTY * ciZ - mjTZ * ciY;
      let eY = mjTW * ciY - mjTX * ciZ + mjTY * ciW + mjTZ * ciX;
      let eZ = mjTW * ciZ + mjTX * ciY - mjTY * ciX + mjTZ * ciW;
      // Ensure shortest-path (eW >= 0).
      if (eW < 0) { eX = -eX; eY = -eY; eZ = -eZ; }
      // Rotation vector ≈ 2 * sin(θ/2) * axis ≈ 2*(ex, ey, ez) for small θ.
      const rotX = 2 * eX;
      const rotY = 2 * eY;
      const rotZ = 2 * eZ;

      // Angular velocity (cvel[body*6 + 0..2] is angular in MJ world).
      const wX = data.cvel?.[off6 + 0] ?? 0;
      const wY = data.cvel?.[off6 + 1] ?? 0;
      const wZ = data.cvel?.[off6 + 2] ?? 0;

      // Torque = k_rot * rotVec - c_rot * angVel. Scale by mass as a rough
      // stand-in for inertia (we don't read the inertia tensor directly).
      const kRot = ART_OMEGA * ART_OMEGA * mass;
      const cRot = 2 * ART_ZETA * ART_OMEGA * mass;
      let tx = kRot * rotX - cRot * wX;
      let ty = kRot * rotY - cRot * wY;
      let tz = kRot * rotZ - cRot * wZ;
      const tmag = Math.hypot(tx, ty, tz);
      if (tmag > ART_TORQUE_CAP) {
        const s = ART_TORQUE_CAP / tmag;
        tx *= s; ty *= s; tz *= s;
      }

      data.xfrc_applied[off6 + 0] = fx;
      data.xfrc_applied[off6 + 1] = fy;
      data.xfrc_applied[off6 + 2] = fz;
      data.xfrc_applied[off6 + 3] = tx;
      data.xfrc_applied[off6 + 4] = ty;
      data.xfrc_applied[off6 + 5] = tz;
    }
  }
}
