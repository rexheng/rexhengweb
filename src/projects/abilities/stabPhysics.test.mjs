import assert from "node:assert/strict";
import test from "node:test";

import {
  bodyPosFromXpos,
  subtreeComFromData,
  computeBallisticLunge,
  shouldTriggerNearContact,
} from "./stabPhysics.mjs";

test("bodyPosFromXpos reads MuJoCo body positions in world coordinates", () => {
  const data = {
    xpos: new Float64Array([
      0, 0, 0,
      1.25, -0.5, 0.9,
      -2, 3, 0.4,
    ]),
  };

  assert.deepEqual(bodyPosFromXpos(data, 1), { x: 1.25, y: -0.5, z: 0.9 });
});

test("subtreeComFromData reads humanoid center of mass when available", () => {
  const data = {
    xpos: new Float64Array([
      0, 0, 0,
      1.25, -0.5, 0.9,
    ]),
    subtree_com: new Float64Array([
      0, 0, 0,
      0.4, 0.2, 0.65,
    ]),
  };

  assert.deepEqual(subtreeComFromData(data, 1), { x: 0.4, y: 0.2, z: 0.65 });
});

test("computeBallisticLunge reaches the target height under gravity", () => {
  const lunge = computeBallisticLunge({
    from: { x: 0, y: 0, z: 0.3 },
    to: { x: 2.4, y: 0.4, z: 1.1 },
    gravityZ: -9.81,
  });

  assert.ok(lunge.time >= 0.42);
  assert.ok(lunge.time <= 0.62);
  assert.ok(lunge.horizontalSpeed >= 5);
  assert.ok(lunge.horizontalSpeed <= 14);

  const landedZ = 0.3 + lunge.vz * lunge.time + 0.5 * -9.81 * lunge.time ** 2;
  assert.ok(Math.abs(landedZ - 1.1) < 1e-9);
});

test("shouldTriggerNearContact only fires near the target after the lunge has travelled", () => {
  const target = { x: 1, y: 1, z: 1 };

  assert.equal(shouldTriggerNearContact({
    elapsedMs: 40,
    slotPos: { x: 1.02, y: 1.01, z: 1.03 },
    targetPos: target,
  }), false);

  assert.equal(shouldTriggerNearContact({
    elapsedMs: 260,
    slotPos: { x: 1.02, y: 1.01, z: 1.03 },
    targetPos: target,
  }), true);

  assert.equal(shouldTriggerNearContact({
    elapsedMs: 260,
    slotPos: { x: 1.6, y: 1, z: 1 },
    targetPos: target,
  }), false);
});
