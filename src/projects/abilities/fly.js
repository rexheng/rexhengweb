// Fly ability — the Cultivate Wright Flyer takes off, flies one banked circuit
// over the playground and lands back where it started (or on the nearest
// clear patch, when the collapsed humanoid or another sprite covers that
// spot). Of ~140 candidate circuits (heading × turn side × size) it picks the
// one that stays on screen, out from behind the controls panel, and clear of
// the humanoid and other sprites.
//
// The body is driven kinematically: every frame we write the freejoint qpos
// from a precomputed smooth plan (see flightPath.mjs) plus the qvel that
// carries it along the path until the next write, and hold its weight with
// qfrc_applied so gravity doesn't sag it between writes. Physics substeps
// and rendering therefore stay in lock-step with the path. Collisions for the
// plane are off while it flies (no ploughing into the humanoid or other
// sprites); on landing we park it level at its rest height with zero
// velocity, drop the weight support and restore its collision flags, so
// physics takes over with nothing to settle.
//
// The clock is MuJoCo's own sim time (data.time), so pause and slow-motion
// presets apply to the flight exactly as they do to everything else.
//
// Hand-back cases:
//   - lands normally            → level, zero velocity, collisions restored
//   - user grabs it mid-flight  → stop driving, zero velocity, grab spring wins
//   - punted / disturbed        → stop driving, keep the physics velocity
//   - Clear all / park / reload → cancel() restores collisions
//   - re-triggered mid-flight   → the running flight hands over to a fresh
//     one, which carries the current velocity into a smooth glide down to a
//     runway just ahead, then flies a new circuit (one controller per body)

import * as THREE from "three";
import { findBody } from "./impulse.js";
import { createFlightPlan, noseHeading, quatRotate } from "./flightPath.mjs";

const PROP_MAX_RAD_S = 30;        // ~29°/frame at 60 fps: reads as spinning, no strobe
const DISTURB_M = 0.12;           // off-path jump that means something else moved it
const SCALES = [1, 0.82, 0.66, 0.5];   // smaller circuits for zoomed-in cameras
const HEADINGS = 16;

const activeFlights = new Map();  // slot.bodyID → running flight controller
const restHeights = new Map();    // slot.bodyID → { hz, z } last measured resting height

const noop = () => ({ tick() { return false; } });

function readPose(data, qposAdr) {
  return {
    pos: [data.qpos[qposAdr], data.qpos[qposAdr + 1], data.qpos[qposAdr + 2]],
    quat: [data.qpos[qposAdr + 3], data.qpos[qposAdr + 4], data.qpos[qposAdr + 5], data.qpos[qposAdr + 6]],
  };
}

// The controls panel's rectangle in NDC (empty when it isn't on screen), so
// the planner can keep the plane out from behind it. Visibility is read from
// the computed style and rect: the panel is position:fixed, so offsetParent
// is always null and says nothing about whether it's shown.
function uiRectsNdc(app) {
  const canvas = app.renderer?.domElement;
  const panel = document.getElementById("rex-controls");
  if (!canvas || !panel) return [];
  const c = canvas.getBoundingClientRect();
  if (c.width <= 0 || c.height <= 0) return [];
  const cs = getComputedStyle(panel);
  if (cs.display === "none" || cs.visibility === "hidden") return [];
  const p = panel.getBoundingClientRect();
  if (p.width <= 0 || p.height <= 0) return [];
  const nx = (px) => ((px - c.left) / c.width) * 2 - 1;
  const ny = (py) => 1 - ((py - c.top) / c.height) * 2;
  return [{ x0: nx(p.left) - 0.06, x1: nx(p.right) + 0.06, y0: ny(p.bottom) - 0.06, y1: ny(p.top) + 0.06 }];
}

// Everything the plane should keep clear of, as horizontal discs with a top
// height: each humanoid geom (bounding sphere) and each other spawned sprite.
function obstacles(app, slot) {
  const model = app.model, data = app.data;
  const slotIds = new Set((app.projectSystem?.slots || []).map((s) => s.bodyID));
  const human = [];
  if (model.geom_bodyid && data.geom_xpos && model.geom_rbound) {
    for (let g = 0; g < model.ngeom; g++) {
      const bid = model.geom_bodyid[g];
      if (bid <= 0 || slotIds.has(bid)) continue;
      const r = model.geom_rbound[g];
      human.push({ x: data.geom_xpos[g * 3], y: data.geom_xpos[g * 3 + 1], top: data.geom_xpos[g * 3 + 2] + r, r });
    }
  }
  if (!human.length) {
    // Fallback: the torso alone, with a generous radius.
    const torso = findBody(app, "torso");
    if (torso) {
      const v = new THREE.Vector3();
      torso.updateWorldMatrix(true, false);
      v.setFromMatrixPosition(torso.matrixWorld);
      human.push({ x: v.x, y: -v.z, top: Math.max(0.6, v.y + 0.5), r: 0.5 });
    }
  }
  const sprites = [];
  for (const s of app.projectSystem?.slots || []) {
    if (!s.project || s.bodyID === slot.bodyID) continue;
    const g = model.body_geomadr[s.bodyID];
    const r = g >= 0 ? Math.hypot(model.geom_size[g * 3], model.geom_size[g * 3 + 1]) : 0.3;
    const b = s.bodyID * 3;
    sprites.push({ x: data.xpos[b], y: data.xpos[b + 1], top: data.xpos[b + 2] + 0.5, r });
  }
  return { human, sprites };
}

// How far a footprint of radius `foot` at (x, y) intrudes into the obstacles
// (0 when clear). Obstacles whose top is below the plane's belly height
// (above the floor) don't count.
function intrusion(list, x, y, belly, foot, margin) {
  let sum = 0;
  for (const o of list) {
    if (belly > o.top + margin) continue;
    const d = Math.hypot(x - o.x, y - o.y);
    sum += Math.max(0, o.r + foot + margin - d);
  }
  return sum;
}

// Score candidate circuits (landing spot, then heading × turn side × size)
// by how well they stay in frame and clear of the humanoid / other sprites;
// return the best plan.
function choosePlan(app, slot, base, footprint) {
  const camera = app.camera;
  const curHeading = noseHeading(base.startQuat);
  const fallback = () => createFlightPlan({ ...base, heading: curHeading, side: 1, scale: 1 });
  if (!camera) return fallback();

  camera.updateMatrixWorld();
  const ui = uiRectsNdc(app);
  const v = new THREE.Vector3();
  const { human, sprites } = obstacles(app, slot);
  // How far an MJ-frame point is off screen or hidden behind the controls
  // panel, in NDC (0 when clearly visible), or null when behind the camera.
  const offFrame = (x, y, z) => {
    v.set(x, z, -y).applyMatrix4(camera.matrixWorldInverse);   // MJ → THREE
    if (v.z > -0.2) return null;
    v.applyMatrix4(camera.projectionMatrix);
    let over = Math.max(0, -0.9 - v.x, v.x - 0.9) + Math.max(0, -0.85 - v.y, v.y - 0.78);
    for (const r of ui) {
      if (v.x <= r.x0 || v.x >= r.x1 || v.y <= r.y0 || v.y >= r.y1) continue;
      over += Math.min(v.x - r.x0, r.x1 - v.x, v.y - r.y0, r.y1 - v.y);   // depth behind the panel
    }
    return over;
  };

  // 1. Landing spot. The takeoff point doesn't depend on heading; touch down
  // there unless the humanoid (often collapsed right beside a fresh spawn) or
  // another sprite now covers it, in which case pick the nearest clear,
  // in-frame patch within reach.
  const runway = createFlightPlan({ ...base, heading: curHeading }).runway;
  const landCands = [[0, 0]];
  for (const r of [0.55, 0.9, 1.2]) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      landCands.push([r * Math.cos(a), r * Math.sin(a)]);
    }
  }
  let landOffset = [0, 0], bestLand = Infinity;
  for (const off of landCands) {
    const x = runway[0] + off[0], y = runway[1] + off[1];
    const of = offFrame(x, y, base.groundZ);
    let score = 0.5 * Math.hypot(off[0], off[1]) + (of == null ? 6 : of * 8);
    score += 30 * intrusion(human, x, y, 0, footprint, 0.06);
    score += 30 * intrusion(sprites, x, y, 0, footprint, 0.06);
    if (score < bestLand - 1e-9) { bestLand = score; landOffset = off; }
  }

  // 2. Circuit. A plane parked beside the humanoid can't help starting its
  // roll there, so only count getting closer than it already is: every plan
  // pays the same for the start, and framing decides between them.
  const nearH0 = intrusion(human, runway[0], runway[1], 0, footprint, 0.2);
  const nearS0 = intrusion(sprites, runway[0], runway[1], 0, footprint, 0.2);
  // Turning onto a new runway costs little from rest; when already moving
  // (a mid-air re-trigger) prefer runways along the current track so the
  // glide down doesn't swing the nose round.
  const sv = base.startVel || [0, 0, 0];
  const moving = Math.min(1, Math.hypot(sv[0], sv[1]) / 1.5);
  const trackHeading = moving > 0.05 ? Math.atan2(sv[1], sv[0]) : curHeading;
  const turnWeight = 0.4 + 2.5 * moving;

  const headings = [];
  for (let i = 0; i < HEADINGS; i++) headings.push(trackHeading + (i / HEADINGS) * Math.PI * 2);

  let best = null, bestScore = Infinity;
  for (const scale of SCALES) {
    for (const side of [1, -1]) {
      for (const heading of headings) {
        const plan = createFlightPlan({ ...base, heading, side, scale, landOffset });
        let score = (1 - scale) * 2;
        const dPsi = Math.atan2(Math.sin(heading - trackHeading), Math.cos(heading - trackHeading));
        score += turnWeight * Math.abs(dPsi) / Math.PI;
        const n = 36;
        for (let i = 0; i <= n; i++) {
          const t = plan.prepSec + (i / n) * plan.flightSec;
          const [x, y, z] = plan.pose(t).pos;
          const of = offFrame(x, y, z);
          if (of == null) { score += 3; continue; }       // behind / at the camera
          score += of * 8;
          // Low passes over the humanoid read as flying through it.
          const belly = z - base.groundZ;
          score += 4 * Math.max(0, intrusion(human, x, y, belly, footprint, 0.2) - nearH0);
          score += 2 * Math.max(0, intrusion(sprites, x, y, belly, footprint, 0.2) - nearS0);
        }
        if (score < bestScore) { bestScore = score; best = plan; }
      }
    }
  }
  return best || fallback();
}

export function fly({ app, slot, mesh }) {
  const model = app.model, data = app.data;
  if (!model || !data) return noop();
  const bodyID = slot.bodyID;

  if (app.grabber?.active && app.grabber?.bodyID === bodyID) return noop();
  if (app.pinSystem?.isPinned?.(bodyID)) return noop();

  const jntAdr = model.body_jntadr[bodyID];
  if (jntAdr < 0 || model.jnt_type[jntAdr] !== 0) return noop();   // freejoint only
  const qposAdr = model.jnt_qposadr[jntAdr];
  const dofAdr = model.jnt_dofadr[jntAdr];
  const geomAdr = model.body_geomadr[bodyID];
  const geomNum = model.body_geomnum[bodyID];
  const hz = geomAdr >= 0 ? model.geom_size[geomAdr * 3 + 2] : 0.1;

  // Re-trigger mid-flight: hand over from the running flight. It restores
  // collisions and weight first, so this flight snapshots the real flags.
  let handover = null;
  const running = activeFlights.get(bodyID);
  if (running && !running.done) {
    handover = { groundZ: running.groundZ, propRate: running.propRate };
    running.finish("handover");
  }

  // Rest height. If the plane is resting upright, use its measured height so
  // the hand-back matches the contact equilibrium exactly (no settle, no
  // bounce) and remember it; otherwise reuse the last measurement for this
  // hitbox, falling back to the box half-height.
  const start = readPose(data, qposAdr);
  const startVel = [data.qvel[dofAdr], data.qvel[dofAdr + 1], data.qvel[dofAdr + 2]];
  const upZ = quatRotate(start.quat, [0, 0, 1])[2];
  const speed0 = Math.hypot(...startVel);
  const resting = !handover && upZ > 0.98 && Math.abs(start.pos[2] - hz) < 0.03 && speed0 < 0.2;
  const known = restHeights.get(bodyID);
  let groundZ;
  if (handover) groundZ = handover.groundZ;
  else if (resting) groundZ = start.pos[2];
  else if (known && Math.abs(known.hz - hz) < 1e-6) groundZ = known.z;
  else groundZ = hz;
  if (resting) restHeights.set(bodyID, { hz, z: groundZ });

  // Footprint for clearance checks: most of the half-span (the Flyer is far
  // wider than it is long, and the heading isn't known yet).
  const footprint = geomAdr >= 0 ? 0.85 * Math.max(model.geom_size[geomAdr * 3], model.geom_size[geomAdr * 3 + 1]) : 0.3;
  const plan = choosePlan(app, slot, {
    startPos: start.pos,
    startQuat: start.quat,
    // A resting body's contact jitter isn't motion worth carrying.
    startVel: resting ? [0, 0, 0] : startVel,
    startPropRate: handover ? handover.propRate : 0,
    groundZ,
  }, footprint);

  // Collisions off while flying; remember the flags to restore.
  const savedCollision = [];
  for (let g = 0; g < geomNum; g++) {
    const id = geomAdr + g;
    savedCollision.push([model.geom_contype[id], model.geom_conaffinity[id]]);
    model.geom_contype[id] = 0;
    model.geom_conaffinity[id] = 0;
  }
  const restoreCollision = () => {
    for (let g = 0; g < savedCollision.length; g++) {
      model.geom_contype[geomAdr + g] = savedCollision[g][0];
      model.geom_conaffinity[geomAdr + g] = savedCollision[g][1];
    }
  };

  // Weight support: an upward generalized force on the freejoint's z DOF
  // equal to m·g (the slot's single geom is centred on the body origin, so
  // there's no stray torque). Re-asserted every tick, since the gravity
  // preset can change mid-flight.
  const mass = model.body_mass?.[bodyID] ?? 1;
  const holdWeight = () => {
    if (!data.qfrc_applied) return;
    data.qfrc_applied[dofAdr + 2] = -mass * (model.opt?.gravity?.[2] ?? -9.81);
  };
  const dropWeight = () => { if (data.qfrc_applied) data.qfrc_applied[dofAdr + 2] = 0; };

  const props = [mesh?.getObjectByName("prop_L"), mesh?.getObjectByName("prop_R")];
  const project = slot.project;
  const simTime = () => (typeof data.time === "number" ? data.time : performance.now() / 1000);
  const t0 = simTime();
  let lastT = 0;
  let last = null;                  // { pos, vel } written last tick

  const writeState = (st) => {
    for (let k = 0; k < 3; k++) data.qpos[qposAdr + k] = st.pos[k];
    for (let k = 0; k < 4; k++) data.qpos[qposAdr + 3 + k] = st.quat[k];
    for (let k = 0; k < 3; k++) data.qvel[dofAdr + k] = st.vel[k];
    for (let k = 0; k < 3; k++) data.qvel[dofAdr + 3 + k] = st.angVel[k];
  };
  const zeroVel = () => { for (let k = 0; k < 6; k++) data.qvel[dofAdr + k] = 0; };

  const flight = {
    done: false,
    plan,
    groundZ,
    propRate: 0,
    finish(mode) {
      if (flight.done) return;
      flight.done = true;
      if (activeFlights.get(bodyID) === flight) activeFlights.delete(bodyID);
      // Scene reloaded under us: the old model/data are gone or orphaned.
      if (app.model !== model || app.data !== data) return;
      try {
        if (mode === "land") {
          const end = plan.state(plan.duration);
          writeState({ ...end, vel: [0, 0, 0], angVel: [0, 0, 0] });
        } else if (mode === "grab") {
          zeroVel();
        }
        dropWeight();
        restoreCollision();
        app.mujoco?.mj_forward?.(model, data);
      } catch (_) {
        // Model torn down mid-call; nothing left to restore.
      }
    },
    tick() {
      if (flight.done) return false;
      // The project may have been parked/replaced without cancel().
      if (slot.bodyID !== bodyID || slot.project !== project) { flight.finish("cancel"); return false; }
      if (app.model !== model || app.data !== data) { flight.finish("cancel"); return false; }
      if (app.grabber?.active && app.grabber?.bodyID === bodyID) { flight.finish("grab"); return false; }
      if (app.pinSystem?.isPinned?.(bodyID)) { flight.finish("disturbed"); return false; }

      const now = simTime();
      const t = now - t0;
      if (t < lastT - 1e-6) { flight.finish("cancel"); return false; }   // sim was reset
      const dt = t - lastT;

      if (last) {
        // Physics integrated our last write over dt; anything far off that
        // means a punt/reset/other force moved the plane. Let physics have it.
        const p = readPose(data, qposAdr).pos;
        const ex = last.pos[0] + last.vel[0] * dt;
        const ey = last.pos[1] + last.vel[1] * dt;
        const ez = last.pos[2] + last.vel[2] * dt;
        if (Math.hypot(p[0] - ex, p[1] - ey, p[2] - ez) > DISTURB_M) {
          flight.finish("disturbed");
          return false;
        }
      }

      if (t >= plan.duration) { flight.finish("land"); return false; }

      const st = plan.state(t);
      writeState(st);
      holdWeight();
      last = { pos: st.pos, vel: st.vel };
      flight.propRate = st.propRate;

      const spin = PROP_MAX_RAD_S * st.propRate * dt;
      if (props[0]) props[0].rotation.z += spin;
      if (props[1]) props[1].rotation.z -= spin;   // the Flyer's props counter-rotate

      lastT = t;
      return true;
    },
    cancel() { flight.finish("cancel"); },
  };

  activeFlights.set(bodyID, flight);
  // First write immediately so this frame's physics step already follows the plan.
  flight.tick();
  return flight;
}
