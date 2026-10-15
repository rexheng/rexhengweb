import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import load_mujoco from "../../vendor/mujoco/mujoco_wasm.js";
import { parkSlotBody, setBodyCollision } from "./slotParking.mjs";
import {
  MJ_GEOM_BOX,
  MJ_GEOM_SPHERE,
  applyBoxCollider,
  applySphereCollider,
  captureSlotCollider,
  normalizeCollider,
  restoreSlotCollider,
} from "./slotCollider.mjs";

async function loadHumanoid() {
  const mujoco = await load_mujoco();
  try {
    mujoco.FS.mkdir("/working");
  } catch (_) {
    // The Emscripten FS persists for the lifetime of this module instance.
  }
  mujoco.FS.mount(mujoco.MEMFS, { root: "." }, "/working");
  mujoco.FS.writeFile(
    "/working/humanoid.xml",
    fs.readFileSync("./assets/scenes/humanoid.xml", "utf8"),
  );
  const model = mujoco.MjModel.loadFromXML("/working/humanoid.xml");
  const data = new mujoco.MjData(model);
  return { mujoco, model, data };
}

function slotBodies(model) {
  const dec = new TextDecoder();
  const names = new Uint8Array(model.names);
  const out = [];
  for (let bodyID = 1; bodyID < model.nbody; bodyID++) {
    const start = model.name_bodyadr[bodyID];
    let end = start;
    while (end < names.length && names[end] !== 0) end++;
    if (dec.decode(names.subarray(start, end)).startsWith("project_slot_")) out.push(bodyID);
  }
  return out;
}

// Drop one slot onto the floor (well away from the humanoid at the origin),
// keeping the other slots parked as the runtime does, and step `seconds`.
function dropSlot(mujoco, model, data, bodyID, others, { x = 3, y = 3, z = 0.9, vx = 0, seconds = 2, onStep } = {}) {
  setBodyCollision(model, bodyID, { contype: 2, conaffinity: 1 });
  const jnt = model.body_jntadr[bodyID];
  const q = model.jnt_qposadr[jnt];
  const dof = model.jnt_dofadr[jnt];
  data.qpos.set([x, y, z, 1, 0, 0, 0], q);
  for (let i = 0; i < 6; i++) data.qvel[dof + i] = 0;
  data.qvel[dof + 0] = vx;
  mujoco.mj_forward(model, data);
  const steps = Math.round(seconds / model.opt.timestep);
  for (let s = 0; s < steps; s++) {
    others.forEach((b, i) => parkSlotBody(model, data, b, 60 + (i + 1) * 0.5));
    mujoco.mj_step(model, data);
    onStep?.(s, q, dof);
  }
  return { q, dof };
}

test("normalizeCollider accepts box/sphere forms and rejects junk", () => {
  assert.deepEqual(normalizeCollider(undefined), { type: "box" });
  assert.deepEqual(normalizeCollider("box"), { type: "box" });
  assert.deepEqual(normalizeCollider("sphere"), { type: "sphere", radius: null });
  assert.deepEqual(normalizeCollider({ type: "sphere", radius: 0.25 }), { type: "sphere", radius: 0.25 });
  assert.deepEqual(normalizeCollider({ type: "sphere", radius: -1 }), { type: "sphere", radius: null });
  assert.equal(normalizeCollider("capsule"), null);
  assert.equal(normalizeCollider(42), null);
});

test("sphere collider rests on the floor at its radius and rolls when pushed", async () => {
  const { mujoco, model, data } = await loadHumanoid();
  const [bodyID, ...others] = slotBodies(model);
  const snap = captureSlotCollider(model, bodyID);
  assert.equal(snap.geomType, MJ_GEOM_BOX);

  const R = 0.25;
  applySphereCollider(model, bodyID, snap, R);
  const g = model.body_geomadr[bodyID];
  assert.equal(model.geom_type[g], MJ_GEOM_SPHERE);
  assert.equal(model.geom_rbound[g], R);

  // Settles at z = R (soft-contact penetration is sub-millimetre) and stays put.
  const { q, dof } = dropSlot(mujoco, model, data, bodyID, others, { seconds: 2 });
  assert.ok(Math.abs(data.qpos[q + 2] - R) < 0.002, `rest z ${data.qpos[q + 2]}`);
  let maxV = 0;
  for (let i = 0; i < 6; i++) maxV = Math.max(maxV, Math.abs(data.qvel[dof + i]));
  assert.ok(maxV < 1e-3, `residual speed ${maxV}`);

  // Push along +x: it rolls (spin about +y ≈ v / R, no sliding) and the
  // rolling friction + angular damping bring it to rest within a few metres.
  let rollingChecked = false;
  const x0 = 3;
  dropSlot(mujoco, model, data, bodyID, others, {
    z: R, vx: 2, seconds: 8,
    onStep(s, qa, da) {
      if (s === 100) { // 0.5 s in: friction has converted slide into roll
        const vx = data.qvel[da + 0];
        const wy = data.qvel[da + 4];
        assert.ok(vx > 0.3, `still moving ${vx}`);
        assert.ok(Math.abs(wy * R - vx) < 0.05 * vx, `rolling: wy*R=${wy * R} vx=${vx}`);
        rollingChecked = true;
      }
    },
  });
  assert.ok(rollingChecked);
  const travelled = data.qpos[q + 0] - x0;
  assert.ok(travelled > 0.3 && travelled < 4, `travelled ${travelled}`);
  assert.ok(Math.abs(data.qvel[dof + 0]) < 0.02, `came to rest, vx=${data.qvel[dof + 0]}`);
  assert.ok(Math.abs(data.qpos[q + 2] - R) < 0.002, `still on the floor z=${data.qpos[q + 2]}`);

  data.delete();
  model.delete();
});

test("box collider after a sphere restores every compiled field and sits flat", async () => {
  const { mujoco, model, data } = await loadHumanoid();
  const [bodyID, ...others] = slotBodies(model);
  const snap = captureSlotCollider(model, bodyID);

  applySphereCollider(model, bodyID, snap, 0.25);
  restoreSlotCollider(model, bodyID, snap);
  assert.deepEqual(captureSlotCollider(model, bodyID), snap);

  applySphereCollider(model, bodyID, snap, 0.25);
  applyBoxCollider(model, bodyID, snap, { hx: 0.2, hy: 0.15, hz: 0.3 });
  const after = captureSlotCollider(model, bodyID);
  assert.deepEqual(after, { ...snap, size: [0.2, 0.15, 0.3] });

  const { q } = dropSlot(mujoco, model, data, bodyID, others, { seconds: 2 });
  assert.ok(Math.abs(data.qpos[q + 2] - 0.3) < 0.003, `box rest z ${data.qpos[q + 2]}`);

  data.delete();
  model.delete();
});
