import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import load_mujoco from "../../vendor/mujoco/mujoco_wasm.js";
import { parkSlotBody, setBodyCollision } from "./slotParking.mjs";

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

function bodyNames(model) {
  const dec = new TextDecoder();
  const names = new Uint8Array(model.names);
  return (bodyID) => {
    const start = model.name_bodyadr[bodyID];
    let end = start;
    while (end < names.length && names[end] !== 0) end++;
    return dec.decode(names.subarray(start, end));
  };
}

function slotBodies(model) {
  const nameOf = bodyNames(model);
  const out = [];
  for (let bodyID = 1; bodyID < model.nbody; bodyID++) {
    if (nameOf(bodyID).startsWith("project_slot_")) out.push(bodyID);
  }
  return out;
}

test("project slots compile with floor collision enabled for later spawning", async () => {
  const { mujoco, model, data } = await loadHumanoid();
  const slots = slotBodies(model);
  assert.equal(slots.length, 8);

  for (const bodyID of slots) {
    const geomStart = model.body_geomadr[bodyID];
    const geomCount = model.body_geomnum[bodyID];
    for (let offset = 0; offset < geomCount; offset++) {
      const geomID = geomStart + offset;
      assert.equal(model.geom_contype[geomID], 2);
      assert.equal(model.geom_conaffinity[geomID], 1);
    }
  }

  mujoco.mj_forward(model, data);
  const nameOf = bodyNames(model);
  for (let i = 0; i < data.ncon; i++) {
    const c = data.contact.get(i);
    const a = nameOf(model.geom_bodyid[c.geom1]);
    const b = nameOf(model.geom_bodyid[c.geom2]);
    assert.ok(!a.startsWith("project_slot_") && !b.startsWith("project_slot_"));
  }

  data.delete();
  model.delete();
});

test("spawned project slot collides with the floor instead of falling through", async () => {
  const { mujoco, model, data } = await loadHumanoid();
  const slots = slotBodies(model);
  const [activeBodyID, ...inactiveBodyIDs] = slots;

  for (let i = 0; i < inactiveBodyIDs.length; i++) {
    parkSlotBody(model, data, inactiveBodyIDs[i], 60 + (i + 1) * 0.5);
  }

  setBodyCollision(model, activeBodyID, { contype: 2, conaffinity: 1 });
  const jointID = model.body_jntadr[activeBodyID];
  const qposAdr = model.jnt_qposadr[jointID];
  const dofAdr = model.jnt_dofadr[jointID];
  data.qpos[qposAdr + 0] = 0;
  data.qpos[qposAdr + 1] = 0;
  data.qpos[qposAdr + 2] = 1.2;
  data.qpos[qposAdr + 3] = 1;
  data.qpos[qposAdr + 4] = 0;
  data.qpos[qposAdr + 5] = 0;
  data.qpos[qposAdr + 6] = 0;
  for (let i = 0; i < 6; i++) data.qvel[dofAdr + i] = 0;
  mujoco.mj_forward(model, data);

  let sawActiveFloorContact = false;
  for (let step = 0; step < 1200; step++) {
    for (let i = 0; i < inactiveBodyIDs.length; i++) {
      parkSlotBody(model, data, inactiveBodyIDs[i], 60 + (i + 1) * 0.5);
    }
    mujoco.mj_step(model, data);
    for (let i = 0; i < data.ncon; i++) {
      const c = data.contact.get(i);
      const body1 = model.geom_bodyid[c.geom1];
      const body2 = model.geom_bodyid[c.geom2];
      if ((body1 === 0 && body2 === activeBodyID) || (body2 === 0 && body1 === activeBodyID)) {
        sawActiveFloorContact = true;
      }
    }
  }

  assert.ok(sawActiveFloorContact);
  assert.ok(data.qpos[qposAdr + 2] > 0.25);

  data.delete();
  model.delete();
});

test("parkSlotBody keeps an inactive freejoint slot parked without changing collision masks", async () => {
  const { model, data } = await loadHumanoid();
  const [bodyID] = slotBodies(model);
  const jointID = model.body_jntadr[bodyID];
  const qposAdr = model.jnt_qposadr[jointID];
  const dofAdr = model.jnt_dofadr[jointID];

  setBodyCollision(model, bodyID, { contype: 2, conaffinity: 1 });
  data.qpos[qposAdr + 0] = 10;
  data.qpos[qposAdr + 1] = 11;
  data.qpos[qposAdr + 2] = 12;
  for (let i = 0; i < 6; i++) data.qvel[dofAdr + i] = 99;

  parkSlotBody(model, data, bodyID, 60);

  assert.deepEqual(
    Array.from(data.qpos.subarray(qposAdr, qposAdr + 7)),
    [0, 0, 60, 1, 0, 0, 0],
  );
  assert.deepEqual(Array.from(data.qvel.subarray(dofAdr, dofAdr + 6)), [0, 0, 0, 0, 0, 0]);
  const geomID = model.body_geomadr[bodyID];
  assert.equal(model.geom_contype[geomID], 2);
  assert.equal(model.geom_conaffinity[geomID], 1);

  data.delete();
  model.delete();
});
