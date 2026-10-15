import test from "node:test";
import assert from "node:assert/strict";
import {
  attitudeQuat,
  createFlightPlan,
  noseHeading,
  quatRotate,
} from "./flightPath.mjs";

const GROUND = 0.085;

function plan(over = {}) {
  return createFlightPlan({
    startPos: [0.4, -0.3, GROUND],
    startQuat: attitudeQuat(2.0, 0, 0),
    groundZ: GROUND,
    heading: 0.5,
    side: 1,
    ...over,
  });
}

const quatAngle = (a, b) => {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, d));
};

test("attitudeQuat puts the nose on body -Y along the heading, level", () => {
  const q = attitudeQuat(Math.PI / 2, 0, 0);
  const nose = quatRotate(q, [0, -1, 0]);
  const up = quatRotate(q, [0, 0, 1]);
  assert.ok(Math.abs(nose[0]) < 1e-9 && Math.abs(nose[1] - 1) < 1e-9);
  assert.ok(Math.abs(up[2] - 1) < 1e-9);
  assert.ok(Math.abs(noseHeading(q) - Math.PI / 2) < 1e-9);
  // Body +X is the left wing; positive bank = left turn = left wing down.
  const banked = attitudeQuat(0, 0, 0.5);
  assert.ok(Math.abs(quatRotate(q, [1, 0, 0])[0] + 1) < 1e-9, "heading +Y: left wing is -X");
  assert.ok(quatRotate(banked, [1, 0, 0])[2] < -0.4);
});

test("plan starts at the current pose and ends parked level at rest on the runway", () => {
  const p = plan();
  const s0 = p.state(0);
  assert.deepEqual(s0.pos.map((v) => +v.toFixed(9)), [0.4, -0.3, GROUND]);
  assert.ok(quatAngle(s0.quat, attitudeQuat(2.0, 0, 0)) < 1e-6);
  const end = p.state(p.duration);
  assert.ok(Math.hypot(end.pos[0] - 0.4, end.pos[1] + 0.3) < 1e-9);
  assert.ok(Math.abs(end.pos[2] - GROUND) < 1e-12);
  assert.ok(quatAngle(end.quat, attitudeQuat(0.5, 0, 0)) < 1e-6);
  assert.ok(Math.hypot(...end.vel) < 1e-9, `end vel ${end.vel}`);
  assert.ok(Math.hypot(...end.angVel) < 1e-9, `end angVel ${end.angVel}`);
  assert.ok(p.duration > 4 && p.duration < 7, `duration ${p.duration}`);
});

test("motion is continuous: no position or attitude jumps, bounded acceleration", () => {
  for (const side of [1, -1]) {
    for (const scale of [1, 0.66, 0.5]) {
      const p = plan({ side, scale });
      const dt = 1 / 240;
      let prev = p.pose(0), prevV = null, maxAcc = 0, maxStep = 0, maxRot = 0;
      for (let t = dt; t <= p.duration + 1e-9; t += dt) {
        const cur = p.pose(t);
        const v = cur.pos.map((x, i) => (x - prev.pos[i]) / dt);
        maxStep = Math.max(maxStep, Math.hypot(...v));
        maxRot = Math.max(maxRot, quatAngle(prev.quat, cur.quat) / dt);
        if (prevV) maxAcc = Math.max(maxAcc, Math.hypot(...v.map((x, i) => (x - prevV[i]) / dt)));
        prevV = v; prev = cur;
      }
      assert.ok(maxStep < 6, `speed spike ${maxStep}`);
      assert.ok(maxRot < 6, `rotation spike ${maxRot} rad/s`);
      assert.ok(maxAcc < 25, `acceleration spike ${maxAcc} m/s^2 (side ${side}, scale ${scale})`);
    }
  }
});

test("touchdown is gentle and the plane is level whenever it is on the ground", () => {
  const p = plan();
  const dt = 1 / 240;
  let airborne = false, landedAt = null, minZ = Infinity, peak = 0;
  for (let t = p.prepSec; t <= p.duration; t += dt) {
    const s = p.state(t);
    minZ = Math.min(minZ, s.pos[2]);
    peak = Math.max(peak, s.pos[2] - GROUND);
    const h = s.pos[2] - GROUND;
    if (h > 0.05) airborne = true;
    if (airborne && landedAt == null && h < 1e-6) {
      landedAt = t;
      assert.ok(Math.abs(s.vel[2]) < 0.02, `sink rate at touchdown ${s.vel[2]}`);
      assert.ok(Math.hypot(s.vel[0], s.vel[1]) > 0.5, "still rolling at touchdown");
    }
    if (h < 0.01) {
      const up = quatRotate(s.quat, [0, 0, 1]);
      assert.ok(up[2] > 0.995, `not level near ground (up.z=${up[2]}) at t=${t}`);
    }
  }
  assert.ok(landedAt != null, "never landed");
  assert.ok(minZ >= GROUND - 1e-9, `went below ground: ${minZ}`);
  assert.ok(peak > 0.6, `circuit too low: ${peak}`);
});

test("nose points along the direction of travel in flight and banks into the turn", () => {
  for (const side of [1, -1]) {
    const p = plan({ side });
    let bankedChecks = 0;
    for (let t = p.prepSec + 0.3; t < p.duration - p.prepSec; t += 0.05) {
      const s = p.state(t);
      const sp = Math.hypot(s.vel[0], s.vel[1]);
      if (sp < 0.8) continue;
      const travel = Math.atan2(s.vel[1], s.vel[0]);
      const d = Math.atan2(Math.sin(noseHeading(s.quat) - travel), Math.cos(noseHeading(s.quat) - travel));
      assert.ok(Math.abs(d) < 0.12, `nose off track by ${d} rad at t=${t}`);
      if (s.pos[2] - GROUND > 0.5) {
        // Left circuit (side=+1) → left wing (body +X) dips.
        const leftWing = quatRotate(s.quat, [1, 0, 0]);
        assert.ok(Math.sign(leftWing[2]) === -side, `banking the wrong way at t=${t}`);
        bankedChecks++;
      }
    }
    assert.ok(bankedChecks > 5);
  }
});

test("re-trigger mid-air carries the current velocity into a glide down, then flies a full circuit", () => {
  const v0 = [1.6, -0.9, -0.4];
  const startPos = [0.2, 0.5, GROUND + 0.8];
  const p = plan({ startPos, startVel: v0, startQuat: attitudeQuat(-0.5, 0.05, 0.4), startPropRate: 1 });
  // Velocity is continuous with what the body was already doing.
  const s0 = p.state(0, 1 / 2000);
  assert.ok(Math.hypot(...s0.vel.map((v, i) => v - v0[i])) < 0.05, `start vel ${s0.vel}`);
  assert.ok(Math.abs(p.pose(0).propRate - 1) < 1e-9, "props keep spinning");
  // Glide moves forward along the velocity (runway ahead, never behind).
  const dx = p.runway[0] - startPos[0], dy = p.runway[1] - startPos[1];
  assert.ok(dx * v0[0] + dy * v0[1] > 0, "runway is ahead of the plane");
  assert.ok(Math.hypot(dx, dy) <= 1.5 + 1e-9);
  // No backtracking during the glide: horizontal speed along v0 stays ≥ 0.
  const dir = [v0[0] / Math.hypot(v0[0], v0[1]), v0[1] / Math.hypot(v0[0], v0[1])];
  const dt = 1 / 240;
  let prev = p.pose(0), minZ = Infinity;
  for (let t = dt; t <= p.prepSec; t += dt) {
    const cur = p.pose(t);
    const along = (cur.pos[0] - prev.pos[0]) * dir[0] + (cur.pos[1] - prev.pos[1]) * dir[1];
    assert.ok(along > -1e-6, `backtracks at t=${t}`);
    minZ = Math.min(minZ, cur.pos[2]);
    prev = cur;
  }
  assert.ok(minZ >= GROUND - 1e-12, "glide stays above the floor");
  // Prep is stretched for the height, and the rest of the flight is intact.
  assert.ok(p.prepSec > 0.8 && p.prepSec <= 1.8, `prep ${p.prepSec}`);
  // A carried-in speed beyond what maxLead allows still never backtracks.
  const fast = plan({ startPos, startVel: [3.8, 0, 0] });
  let px = fast.pose(0).pos[0];
  for (let t = dt; t <= fast.prepSec; t += dt) {
    const x = fast.pose(t).pos[0];
    assert.ok(x - px > -1e-6, `fast glide backtracks at t=${t}`);
    px = x;
  }
  assert.ok(fast.runway[0] - startPos[0] <= 1.5 + 1e-9);
  const end = p.state(p.duration);
  assert.ok(Math.hypot(end.pos[0] - p.runway[0], end.pos[1] - p.runway[1]) < 1e-9);
  assert.ok(Math.abs(end.pos[2] - GROUND) < 1e-12);
  assert.ok(Math.hypot(...end.vel) < 1e-9 && Math.hypot(...end.angVel) < 1e-9);
});

test("mid-air re-trigger plan is free of position and attitude jumps", () => {
  const p = plan({ startPos: [0, 0, GROUND + 0.9], startVel: [-1.8, 0.6, 0.3] });
  const dt = 1 / 240;
  let prev = p.pose(0), prevV = null, maxAcc = 0, maxRot = 0;
  for (let t = dt; t <= p.duration + 1e-9; t += dt) {
    const cur = p.pose(t);
    const v = cur.pos.map((x, i) => (x - prev.pos[i]) / dt);
    maxRot = Math.max(maxRot, quatAngle(prev.quat, cur.quat) / dt);
    if (prevV) maxAcc = Math.max(maxAcc, Math.hypot(...v.map((x, i) => (x - prevV[i]) / dt)));
    prevV = v; prev = cur;
  }
  assert.ok(maxRot < 6, `rotation spike ${maxRot} rad/s`);
  assert.ok(maxAcc < 25, `acceleration spike ${maxAcc} m/s^2`);
});

test("a landing offset moves the touchdown, keeps the motion smooth and the nose on track", () => {
  for (const side of [1, -1]) {
    const off = [0.7, -0.5];
    const p = plan({ side, landOffset: off });
    const end = p.state(p.duration);
    assert.ok(Math.hypot(end.pos[0] - (0.4 + off[0]), end.pos[1] - (-0.3 + off[1])) < 1e-9, `end ${end.pos}`);
    assert.ok(Math.abs(end.pos[2] - GROUND) < 1e-12);
    assert.ok(quatAngle(end.quat, attitudeQuat(0.5, 0, 0)) < 1e-6, "lands on the runway heading");
    assert.ok(Math.hypot(...end.vel) < 1e-9 && Math.hypot(...end.angVel) < 1e-9);
    assert.deepEqual(p.landing.map((v) => +v.toFixed(9)), [1.1, -0.8, GROUND]);

    const dt = 1 / 240;
    let prev = p.pose(0), prevV = null, maxAcc = 0, maxRot = 0;
    for (let t = dt; t <= p.duration + 1e-9; t += dt) {
      const cur = p.pose(t);
      const v = cur.pos.map((x, i) => (x - prev.pos[i]) / dt);
      maxRot = Math.max(maxRot, quatAngle(prev.quat, cur.quat) / dt);
      if (prevV) maxAcc = Math.max(maxAcc, Math.hypot(...v.map((x, i) => (x - prevV[i]) / dt)));
      prevV = v; prev = cur;
      const sp = Math.hypot(v[0], v[1]);
      if (sp > 0.8 && cur.phase !== "prep") {
        const d = Math.atan2(Math.sin(noseHeading(cur.quat) - Math.atan2(v[1], v[0])), Math.cos(noseHeading(cur.quat) - Math.atan2(v[1], v[0])));
        assert.ok(Math.abs(d) < 0.12, `nose off track by ${d} at t=${t}`);
      }
      if (cur.pos[2] - GROUND < 0.01) assert.ok(quatRotate(cur.quat, [0, 0, 1])[2] > 0.995, `not level near ground at t=${t}`);
    }
    assert.ok(maxRot < 6, `rotation spike ${maxRot}`);
    assert.ok(maxAcc < 25, `acceleration spike ${maxAcc}`);
  }
  // Clamped to maxLandOffset.
  const far = plan({ landOffset: [5, 0] });
  assert.ok(Math.abs(far.landing[0] - 0.4 - 1.2) < 1e-9);
});
