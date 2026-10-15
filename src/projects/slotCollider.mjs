// Per-slot collider shape for the pooled project bodies.
//
// Every project rides one of eight pooled freejoint bodies
// (project_slot_0..7 in assets/scenes/humanoid.xml), each compiled with a
// single box geom. Most projects keep that box (resized per spawn to the
// mesh bbox). A def can opt into a ball instead with `collider: "sphere"`
// (or `{ type: "sphere", radius }`); spawn then switches the slot's geom
// to a sphere at runtime and park restores the compiled box, so a slot can
// carry a globe one minute and a box sprite the next.
//
// Switching a geom's type at runtime means keeping every derived field
// MuJoCo would otherwise have computed at compile time consistent:
//   - geom_type / geom_size            the shape itself
//   - geom_rbound / geom_aabb          broad- and mid-phase bounds
//   - body_inertia                      solid-sphere inertia so it rolls right
//   - body_invweight0 / dof_invweight0  contact softness scaling
//   - dof_M0                            diag of the mass matrix at qpos0
//   - geom_condim / geom_friction       rolling + torsional friction
//   - dof_damping (angular dofs)        speed-proportional roll damping
// The slot's original compiled values are snapshotted once per slot and
// restored verbatim, so box projects see exactly the compiled defaults.
//
// Duck-typed against the MuJoCo WASM model's typed-array fields (no THREE,
// no DOM) so it runs under node:test with the vendored build.

export const MJ_GEOM_SPHERE = 2;
export const MJ_GEOM_BOX = 6;

// The slot default is condim 3 (sliding friction only), under which a ball
// on the plane never stops rolling. condim 6 adds torsional and rolling
// friction: a pushed globe slows over a few metres and settles.
export const SPHERE_CONDIM = 6;
export const SPHERE_FRICTION = [1.0, 0.02, 0.02]; // sliding, torsional, rolling
// Rolling friction alone is a constant deceleration, so a punt (~25 m/s)
// would roll the ball for hundreds of metres. A little angular damping
// (N·m·s/rad) scales with speed: a 1 m/s nudge still rolls ~0.4 m, a 3 m/s
// throw ~2 m, and a punt stops within ~45 m (a punted box slides ~65 m).
// Angular only, so falling and flying are unaffected.
export const SPHERE_ANGULAR_DAMPING = 0.15;

/**
 * Normalise a def's `collider` field.
 * Returns { type: "box" } | { type: "sphere", radius: number|null },
 * or null when the value is not understood (caller falls back to box).
 */
export function normalizeCollider(spec) {
  if (spec == null || spec === "box") return { type: "box" };
  if (spec === "sphere") return { type: "sphere", radius: null };
  if (typeof spec === "object") {
    if (spec.type === "box") return { type: "box" };
    if (spec.type === "sphere") {
      const r = Number(spec.radius);
      return { type: "sphere", radius: Number.isFinite(r) && r > 0 ? r : null };
    }
  }
  return null;
}

function slotAddrs(model, bodyID) {
  const geom = model.body_geomadr[bodyID];
  const jnt = model.body_jntadr[bodyID];
  const dof = jnt >= 0 ? model.jnt_dofadr[jnt] : -1;
  return { geom, dof };
}

const copyOut = (arr, start, n) => (arr ? Array.from(arr.subarray(start, start + n)) : null);
const copyIn = (arr, start, values) => {
  if (!arr || !values) return;
  for (let i = 0; i < values.length; i++) arr[start + i] = values[i];
};

/** Snapshot the slot geom/body fields this module may overwrite. */
export function captureSlotCollider(model, bodyID) {
  const { geom: g, dof: d } = slotAddrs(model, bodyID);
  if (g < 0) return null;
  return {
    geomType: model.geom_type[g],
    size: copyOut(model.geom_size, g * 3, 3),
    rbound: model.geom_rbound ? model.geom_rbound[g] : null,
    aabb: copyOut(model.geom_aabb, g * 6, 6),
    condim: model.geom_condim ? model.geom_condim[g] : null,
    friction: copyOut(model.geom_friction, g * 3, 3),
    inertia: copyOut(model.body_inertia, bodyID * 3, 3),
    invweight0: copyOut(model.body_invweight0, bodyID * 2, 2),
    dofInvweight0: d >= 0 ? copyOut(model.dof_invweight0, d, 6) : null,
    dofM0: d >= 0 ? copyOut(model.dof_M0, d, 6) : null,
    dofDamping: d >= 0 ? copyOut(model.dof_damping, d, 6) : null,
    mass: model.body_mass[bodyID],
  };
}

/** Write a snapshot back verbatim (the compiled box). */
export function restoreSlotCollider(model, bodyID, snap) {
  if (!snap) return;
  const { geom: g, dof: d } = slotAddrs(model, bodyID);
  if (g < 0) return;
  model.geom_type[g] = snap.geomType;
  copyIn(model.geom_size, g * 3, snap.size);
  if (model.geom_rbound && snap.rbound != null) model.geom_rbound[g] = snap.rbound;
  copyIn(model.geom_aabb, g * 6, snap.aabb);
  if (model.geom_condim && snap.condim != null) model.geom_condim[g] = snap.condim;
  copyIn(model.geom_friction, g * 3, snap.friction);
  copyIn(model.body_inertia, bodyID * 3, snap.inertia);
  copyIn(model.body_invweight0, bodyID * 2, snap.invweight0);
  if (d >= 0) {
    copyIn(model.dof_invweight0, d, snap.dofInvweight0);
    copyIn(model.dof_M0, d, snap.dofM0);
    copyIn(model.dof_damping, d, snap.dofDamping);
  }
}

/**
 * Box collider: compiled defaults, resized to the given half-extents.
 * Only geom_size changes, exactly as before sphere support existed, so
 * box projects behave identically whether or not the slot last held a
 * sphere.
 */
export function applyBoxCollider(model, bodyID, snap, { hx, hy, hz }) {
  restoreSlotCollider(model, bodyID, snap);
  const { geom: g } = slotAddrs(model, bodyID);
  if (g < 0) return;
  model.geom_size[g * 3 + 0] = hx;
  model.geom_size[g * 3 + 1] = hy;
  model.geom_size[g * 3 + 2] = hz;
}

/** Sphere collider of the given radius, with solid-sphere inertia. */
export function applySphereCollider(model, bodyID, snap, radius) {
  restoreSlotCollider(model, bodyID, snap);
  const { geom: g, dof: d } = slotAddrs(model, bodyID);
  if (g < 0) return;
  const r = radius;
  model.geom_type[g] = MJ_GEOM_SPHERE;
  // MuJoCo reads only size[0] for a sphere; mirror r into all three so any
  // caller reading a "half-height" from size[2] still gets the radius.
  copyIn(model.geom_size, g * 3, [r, r, r]);
  if (model.geom_rbound) model.geom_rbound[g] = r;
  copyIn(model.geom_aabb, g * 6, [0, 0, 0, r, r, r]);
  if (model.geom_condim) model.geom_condim[g] = SPHERE_CONDIM;
  copyIn(model.geom_friction, g * 3, SPHERE_FRICTION);

  const m = model.body_mass[bodyID];
  const I = 0.4 * m * r * r;                       // solid sphere: 2/5 m r²
  copyIn(model.body_inertia, bodyID * 3, [I, I, I]);
  copyIn(model.body_invweight0, bodyID * 2, [1 / m, 1 / I]);
  if (d >= 0) {
    copyIn(model.dof_invweight0, d, [1 / m, 1 / m, 1 / m, 1 / I, 1 / I, 1 / I]);
    copyIn(model.dof_M0, d, [m, m, m, I, I, I]);
    if (model.dof_damping) {
      for (let k = 3; k < 6; k++) model.dof_damping[d + k] = SPHERE_ANGULAR_DAMPING;
    }
  }
}
