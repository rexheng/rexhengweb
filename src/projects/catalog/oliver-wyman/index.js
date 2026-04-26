// Oliver Wyman Datathon — 1st place. 3D animated line-chart sculpture
// (back/floor/side panels with grid, OW-navy line that gently morphs
// between data shapes every few seconds).

import * as THREE from "three";
import { buildMesh, nextTargetValues } from "./build.js";
import { SIZES, ANIM } from "./proportions.js";

// Rebuild the line tube in-place. We allocate a fresh TubeGeometry per
// frame because Three.js TubeGeometry's vertex layout depends on the
// tangents/normals computed from the curve, which change each frame —
// mutating the position attribute alone would leave the geometry
// kinked. The cost (~12 segments × 8 radial × few-hundred floats) is
// trivial at this resolution.
function rebuildLineGeometry(lineMesh, values) {
  const points = [];
  const w = SIZES.frameW, h = SIZES.frameH, d = SIZES.frameD;
  for (let i = 0; i < SIZES.pointCount; i++) {
    const t = i / (SIZES.pointCount - 1);
    const x = -w / 2 + SIZES.padX + t * (w - 2 * SIZES.padX);
    const y = SIZES.padY + values[i] * (h - 2 * SIZES.padY);
    const z = -d / 2 + SIZES.padZ;
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
  accent: "#1f4ba5",
  description:
    "A 14-variable linear regression on marathon performance data — splits, pace, elevation, weather, fuelling, sleep — teasing out which signals actually move finish time and which are just gym folklore. Took 1st place at the Oliver Wyman Datathon.",
  links: [],
  abilityLabel: "Sprint!",
  ability: "roomba",
  // Hitbox + footprintOffset auto-derived (§3.9).
  buildMesh: () => buildMesh({ THREE }),

  // Idle animation: lerp between target value sets every cyclePeriodMs,
  // rebuilding the line tube each frame so the curve smoothly morphs.
  onSpawn(slot, ctx) {
    const chart = ctx.mesh?.userData?.owChart;
    if (!chart) return null;
    const lineMesh = chart.lineMesh;

    let elapsed = 0;
    let from = lineMesh.userData.chartValues.slice();
    let to = nextTargetValues();

    return {
      tick(dtMs) {
        elapsed += dtMs;
        const t = elapsed / ANIM.cyclePeriodMs;
        if (t >= 1) {
          elapsed = 0;
          from = to.slice();
          to = nextTargetValues();
        }
        // Smoothstep so the morph eases at both ends.
        const k = t < 1 ? t : 1;
        const e = k * k * (3 - 2 * k);
        const cur = new Array(SIZES.pointCount);
        for (let i = 0; i < SIZES.pointCount; i++) {
          cur[i] = from[i] + (to[i] - from[i]) * e;
        }
        rebuildLineGeometry(lineMesh, cur);
        return true;        // run forever (cancelled by _park)
      },
      cancel() { /* nothing to restore */ },
    };
  },
};
