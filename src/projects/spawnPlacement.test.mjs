import assert from "node:assert/strict";
import test from "node:test";

import { clearNdcBandX, clampToRing, yawQuatFacing } from "./spawnPlacement.mjs";

// --- clearNdcBandX -------------------------------------------------------

const CANVAS = { left: 0, width: 1000 }; // clientX 0..1000 maps to NDC -1..+1

test("no panel returns the center-biased cap", () => {
  const b = clearNdcBandX(CANVAS, null, 0.55);
  assert.deepEqual(b, { min: -0.55, max: 0.55 });
});

test("left-side panel pushes the band to the clear right side", () => {
  // Panel covers clientX 0..300 → NDC -1..-0.4. Clear band is the right of it.
  const b = clearNdcBandX(CANVAS, { left: 0, right: 300 }, 0.55);
  assert.ok(b.min >= -0.4 - 1e-9, `min ${b.min} should clear the panel`);
  assert.equal(b.max, 0.55);
  assert.ok(b.max > b.min);
});

test("right-side panel pushes the band to the clear left side", () => {
  // Panel covers clientX 700..1000 → NDC 0.4..1. Clear band is left of it.
  const b = clearNdcBandX(CANVAS, { left: 700, right: 1000 }, 0.55);
  assert.equal(b.min, -0.55);
  assert.ok(b.max <= 0.4 + 1e-9, `max ${b.max} should clear the panel`);
  assert.ok(b.max > b.min);
});

test("panel covering everything yields a minimum-width centered band", () => {
  const b = clearNdcBandX(CANVAS, { left: 0, right: 1000 }, 0.55);
  assert.ok(b.max > b.min, "band must be non-degenerate");
  assert.ok(Math.abs(b.min + b.max) < 1e-9, "band stays centered on 0");
});

// --- clampToRing ---------------------------------------------------------

test("hit inside the ring is returned unchanged", () => {
  const r = clampToRing(0, 0, 1.5, 0, 1.2, 2.4);
  assert.ok(Math.abs(r.mjX - 1.5) < 1e-9);
  assert.ok(Math.abs(r.mjY - 0) < 1e-9);
});

test("hit beyond the ring is pulled in to ringMax along the same direction", () => {
  const r = clampToRing(0, 0, 10, 0, 1.2, 2.4);
  assert.ok(Math.abs(Math.hypot(r.mjX, r.mjY) - 2.4) < 1e-9);
  assert.ok(r.mjY === 0 && r.mjX > 0, "direction preserved");
});

test("hit closer than ringMin is pushed out to ringMin along the same direction", () => {
  const r = clampToRing(0, 0, 0, 0.5, 1.2, 2.4);
  assert.ok(Math.abs(Math.hypot(r.mjX, r.mjY) - 1.2) < 1e-9);
  assert.ok(r.mjX === 0 && r.mjY > 0, "direction preserved");
});

test("degenerate hit at the anchor uses the supplied fallback direction at ringMin", () => {
  const r = clampToRing(5, 5, 5, 5, 1.2, 2.4, { x: 1, y: 0 });
  assert.ok(Math.abs(r.mjX - (5 + 1.2)) < 1e-9);
  assert.ok(Math.abs(r.mjY - 5) < 1e-9);
});

// --- yawQuatFacing -------------------------------------------------------

test("facing +x gives identity yaw quaternion", () => {
  const q = yawQuatFacing(0, 0, 1, 0);
  assert.ok(Math.abs(q.qw - 1) < 1e-9);
  assert.ok(Math.abs(q.qz - 0) < 1e-9);
  assert.equal(q.qx, 0);
  assert.equal(q.qy, 0);
});

test("facing +y gives a +90 deg yaw about MJ z", () => {
  const q = yawQuatFacing(0, 0, 0, 1); // yaw = +PI/2
  assert.ok(Math.abs(q.qw - Math.cos(Math.PI / 4)) < 1e-9);
  assert.ok(Math.abs(q.qz - Math.sin(Math.PI / 4)) < 1e-9);
});

test("quaternion is normalized", () => {
  const q = yawQuatFacing(3, -2, -7, 4);
  const n = Math.hypot(q.qw, q.qx, q.qy, q.qz);
  assert.ok(Math.abs(n - 1) < 1e-9);
});
