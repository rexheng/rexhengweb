// Oliver Wyman — floating 3D dual-line chart with transparent grid.
// See spec §3.7. Reference image: ascending line on a 3D chart frame.
// This implementation drops the grey panels and pedestal entirely —
// just two animated lines (red + blue) against a transparent grid.
//
// The two lines morph independently:
//   - Blue line trends upward (monotonicBias)
//   - Red line trends mixed (one or both may dip)
// onSpawn rebuilds each TubeGeometry every frame as the lerp progresses.

import { SIZES, COLOURS, ALPHA, ANIM } from "./proportions.js";

function makeGridGroup(THREE) {
  const w = SIZES.frameW, h = SIZES.frameH;
  const group = new THREE.Group();
  const gridMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(COLOURS.grid),
    transparent: true,
    opacity: ALPHA.grid,
    linewidth: SIZES.gridLineWidth,   // ignored on most platforms but harmless
  });
  const axisMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(COLOURS.axis),
    transparent: true,
    opacity: ALPHA.axis,
    linewidth: SIZES.gridLineWidth,
  });

  // Y-axis ticks: 5 horizontal lines across the back plane (z=0).
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const yi = (i / yTicks) * h;
    const mat = (i === 0) ? axisMat : gridMat;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-w / 2, yi, 0),
      new THREE.Vector3( w / 2, yi, 0),
    ]);
    group.add(new THREE.Line(geom, mat));
  }

  // X-axis ticks: vertical lines at each column position.
  const cols = SIZES.pointCount;
  for (let i = 0; i < cols; i++) {
    const t = i / (cols - 1);
    const xi = -w / 2 + SIZES.padX + t * (w - 2 * SIZES.padX);
    const mat = (i === 0) ? axisMat : gridMat;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(xi, 0, 0),
      new THREE.Vector3(xi, h, 0),
    ]);
    group.add(new THREE.Line(geom, mat));
  }

  return group;
}

// Compute (x, y, z) for the i-th data-point given current values[].
function pointForIndex(THREE, i, values, zOffset) {
  const w = SIZES.frameW;
  const h = SIZES.frameH;
  const t = i / (SIZES.pointCount - 1);
  const x = -w / 2 + SIZES.padX + t * (w - 2 * SIZES.padX);
  const y = SIZES.padY + values[i] * (h - 2 * SIZES.padY);
  return new THREE.Vector3(x, y, zOffset);
}

function buildLineMesh(THREE, values, color, zOffset) {
  const points = [];
  for (let i = 0; i < SIZES.pointCount; i++) {
    points.push(pointForIndex(THREE, i, values, zOffset));
  }
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.05);
  const tubeSeg = (SIZES.pointCount - 1) * 12;
  const geom = new THREE.TubeGeometry(curve, tubeSeg, SIZES.lineRadius, 8, false);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.35,
    metalness: 0.55,
    // Slight emissive so the lines read against any background even
    // when the scene lighting dips.
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.18,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.userData.chartValues = values.slice();
  mesh.userData.tubeSeg = tubeSeg;
  mesh.userData.zOffset = zOffset;
  mesh.userData.color = color;
  return mesh;
}

// Generate a fresh target value set. monotonicBias of the time the
// values trend upward.
export function nextTargetValues(biasUp = ANIM.monotonicBias) {
  const arr = new Array(SIZES.pointCount);
  const upwardTrend = Math.random() < biasUp;
  if (upwardTrend) {
    let v = ANIM.valueMin + Math.random() * 0.15;
    for (let i = 0; i < SIZES.pointCount; i++) {
      arr[i] = v;
      v = Math.min(ANIM.valueMax, v + (0.05 + Math.random() * 0.20));
    }
  } else {
    for (let i = 0; i < SIZES.pointCount; i++) {
      arr[i] = ANIM.valueMin + Math.random() * (ANIM.valueMax - ANIM.valueMin);
    }
  }
  return arr;
}

export function buildMesh({ THREE }) {
  const group = new THREE.Group();
  group.name = "oliver_wyman_chart";

  // Grid sits at z=0; lines are offset slightly forward and back so they
  // don't z-fight with each other or the grid.
  group.add(makeGridGroup(THREE));

  const blueValues = nextTargetValues(0.7);   // strongly upward
  const redValues = nextTargetValues(0.4);    // mixed/volatile
  const blueLine = buildLineMesh(THREE, blueValues, COLOURS.lineBlue, 0.012);
  const redLine = buildLineMesh(THREE, redValues, COLOURS.lineRed, -0.012);
  group.add(blueLine);
  group.add(redLine);

  // Stash references for the onSpawn animator.
  group.userData.owChart = {
    lines: [blueLine, redLine],
    biases: [0.7, 0.4],     // matches initial bias direction per line
    THREE,
  };
  return group;
}
