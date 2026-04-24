// Shared ability helpers — THREE↔MJ swizzle, qvel writes, body lookup.
// See docs/superpowers/specs/2026-04-24-project-sprite-workflow-design.md §3.

/**
 * Locate a THREE.Object3D body in `app.bodies` by its MJCF name.
 * Returns the object, or null when no body matches.
 */
export function findBody(app, name) {
  const bodies = app.bodies;
  if (!bodies) return null;
  for (const b of Object.values(bodies)) if (b?.name === name) return b;
  return null;
}

/**
 * Swizzle a THREE-space direction vector into MuJoCo world space.
 * The THREE loader rotates the MJ z-up frame so MJ `(x, y, z)` renders as
 * THREE `(x, z, -y)`. Inverting, a THREE direction `(tx, ty, tz)` maps to
 * MJ `(tx, -tz, ty)`. Returns `{ x, y, z }`.
 */
export function threeDirToMj({ x, y, z }) {
  return { x: x, y: -z, z: y };
}

/**
 * Read the MuJoCo world position of a THREE body as MJ-space coordinates.
 * `body` must have a current matrixWorld (caller is responsible for
 * `updateWorldMatrix` if the pose has changed this frame). `out` is an
 * optional THREE.Vector3 to reuse; otherwise a plain `{ x, y, z }` object
 * is returned.
 */
export function mjPosOfBody(body, THREE, out) {
  const v = out ?? new THREE.Vector3();
  v.setFromMatrixPosition(body.matrixWorld);
  return { x: v.x, y: -v.z, z: v.y };
}

/**
 * Write six linear+angular velocity components to the freejoint DOFs of
 * `slot`. `vel` is `[vx, vy, vz, wx, wy, wz]` in MJ world frame.
 *
 *  - vx, vy, vz: linear velocity, m/s
 *  - wx, wy, wz: angular velocity, rad/s
 *
 * Does NOT call `mj_forward` — the caller decides when to step.
 */
export function writeQvel(model, data, bodyID, vel) {
  const jntAdr = model.body_jntadr[bodyID];
  const dofAdr = model.jnt_dofadr[jntAdr];
  for (let i = 0; i < 6; i++) data.qvel[dofAdr + i] = vel[i];
}
