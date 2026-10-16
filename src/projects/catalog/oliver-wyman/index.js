// Oliver Wyman Datathon — 1st place. Floating dual-line chart with
// transparent grid: blue (trending up) + red (volatile), both morphing
// continuously between random data shapes every cyclePeriodMs.

import * as THREE from "three";
import { buildMesh, nextTargetValues } from "./build.js";
import { SIZES, ANIM } from "./proportions.js";

// Rebuild a single line's TubeGeometry given current values.
function rebuildLineGeometry(lineMesh, values) {
  const points = [];
  const w = SIZES.frameW, h = SIZES.frameH;
  const z = lineMesh.userData.zOffset;
  for (let i = 0; i < SIZES.pointCount; i++) {
    const t = i / (SIZES.pointCount - 1);
    const x = -w / 2 + SIZES.padX + t * (w - 2 * SIZES.padX);
    const y = SIZES.padY + values[i] * (h - 2 * SIZES.padY);
    points.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.05);
  const tubeSeg = lineMesh.userData.tubeSeg ?? (SIZES.pointCount - 1) * 12;
  const next = new THREE.TubeGeometry(curve, tubeSeg, SIZES.lineRadius, 8, false);
  lineMesh.geometry.dispose();
  lineMesh.geometry = next;
  lineMesh.userData.chartValues = values.slice();
}

export default {
  id: "oliver-wyman",
  label: "Oliver Wyman Datathon",
  title: "Oliver Wyman Datathon — 1st place",
  subtitle: "marathon performance · 14-variable regression",
  meta: "datathon · regression · endurance",
  accent: "#8595d0", // palette C · Lapis
  // Panel mark: one filled path on the 48u grid; source docs/brand/marks/oliver-wyman.svg
  icon: '<path d="M20 4H28A20 20 0 0 1 28 44H20A20 20 0 0 1 20 4ZM20 8A16 16 0 0 0 20 40H28A16 16 0 0 0 28 8ZM20 12H28A12 12 0 0 1 28 36H20A12 12 0 0 1 20 12ZM20 16A8 8 0 0 0 20 32H28A8 8 0 0 0 28 16ZM16.5 27.5A2.5 2.5 0 1 1 21.5 27.5A2.5 2.5 0 1 1 16.5 27.5ZM25 21.5A4 4 0 1 1 33 21.5A4 4 0 1 1 25 21.5Z"/>',
  description:
    "A 14-variable linear regression on marathon performance data — splits, pace, elevation, weather, fuelling, sleep — teasing out which signals actually move finish time and which are just gym folklore. Took 1st place at the Oliver Wyman Datathon.",
  links: [],
  abilityLabel: "Sprint!",
  ability: "roomba",
  // Hitbox + footprintOffset auto-derived (§3.9).
  buildMesh: () => buildMesh({ THREE }),

  // Idle animation: each line lerps to a fresh target every cyclePeriodMs,
  // staggered so the two lines aren't synchronised.
  onSpawn(slot, ctx) {
    const chart = ctx.mesh?.userData?.owChart;
    if (!chart) return null;
    const lines = chart.lines;
    const biases = chart.biases;

    // Per-line state: current `from`, current `to`, elapsed offset.
    const states = lines.map((line, i) => ({
      elapsed: i * 1500,        // stagger so lines don't morph in lockstep
      from: line.userData.chartValues.slice(),
      to: nextTargetValues(biases[i]),
    }));

    return {
      tick(dtMs) {
        for (let i = 0; i < lines.length; i++) {
          const st = states[i];
          st.elapsed += dtMs;
          const t = st.elapsed / ANIM.cyclePeriodMs;
          if (t >= 1) {
            st.elapsed = 0;
            st.from = st.to.slice();
            st.to = nextTargetValues(biases[i]);
          }
          // Smoothstep ease for the morph.
          const k = Math.max(0, Math.min(1, st.elapsed / ANIM.cyclePeriodMs));
          const e = k * k * (3 - 2 * k);
          const cur = new Array(SIZES.pointCount);
          for (let j = 0; j < SIZES.pointCount; j++) {
            cur[j] = st.from[j] + (st.to[j] - st.from[j]) * e;
          }
          rebuildLineGeometry(lines[i], cur);
        }
        return true;
      },
      cancel() { /* nothing to restore */ },
    };
  },
};
