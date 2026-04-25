// Sprint ability — six small spheres chase each other around the Oliver
// Wyman running track for ~2s, then fade and dispose. Spheres are parented
// to the slot mesh so they move with the sprite if it's grabbed.

import * as THREE from "three";
import { stadiumTrackPoint } from "../builders/primitives.js";

const DURATION_MS = 2000;
const RUNNER_COUNT = 6;
const RUNNER_R = 0.04;
const LAP_RATE = 0.5;        // laps per second
const COLOUR = "#ffeebb";    // warm runner highlight

// Track dimensions — must match catalog/oliver-wyman/proportions.js.
const TRACK_OUTER_W = 1.50 * 0.26;
const TRACK_OUTER_D = 0.90 * 0.26;
const TRACK_TUBE_R  = 0.08 * 0.26;
// Runners ride above the track centreline so they read as on top of the lane.
const TRACK_CENTRE_Y_LOCAL = -0.85 * 0.26 + 0.08 * 0.26 + TRACK_TUBE_R + 0.02;

export function sprint({ mesh }) {
  if (!mesh) return { tick() { return false; } };

  const group = new THREE.Group();
  group.name = "sprint_runners";
  mesh.add(group);

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOUR),
    emissive: new THREE.Color(COLOUR),
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0.0,
    transparent: true,
    opacity: 1.0,
  });

  const geom = new THREE.SphereGeometry(RUNNER_R, 12, 10);
  const runners = [];
  for (let i = 0; i < RUNNER_COUNT; i++) {
    const m = new THREE.Mesh(geom, mat);
    m.castShadow = false;
    runners.push({ mesh: m, phase: i / RUNNER_COUNT });
    group.add(m);
  }

  let elapsed = 0;
  let disposed = false;

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (group.parent) group.parent.remove(group);
    geom.dispose();
    mat.dispose();
  }

  return {
    tick(dtMs) {
      if (disposed) return false;
      elapsed += dtMs;
      const t = Math.min(1, elapsed / DURATION_MS);

      const lap = (elapsed / 1000) * LAP_RATE;
      for (const r of runners) {
        const u = (lap + r.phase) % 1;
        const p = stadiumTrackPoint({ outerW: TRACK_OUTER_W, outerD: TRACK_OUTER_D }, u);
        r.mesh.position.set(p.x, TRACK_CENTRE_Y_LOCAL + RUNNER_R + 0.005, p.z);
      }

      // Fade out in the last 30%.
      mat.opacity = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);

      if (t >= 1) {
        dispose();
        return false;
      }
      return true;
    },
    cancel() { dispose(); },
  };
}
