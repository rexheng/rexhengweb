// Oliver Wyman — 3D line-chart sculpture with animated line.
// See spec §3.7. Reference image: ascending navy line on a grey
// L-bracket panel set, value labels along the y axis, year ticks
// along the x axis. Implementation:
//
//   - Pedestal cylinder at the base
//   - Back panel (xy plane) + floor panel (xz plane) + side panel
//     (yz plane) form an L-bracket
//   - Faint white grid lines on back + floor panels
//   - Thick navy CatmullRom tube traces a polyline across pointCount
//     samples at z = back of frame; the onSpawn idle hook lerps the
//     y values between target sets every ANIM.cyclePeriodMs.
//
// The line geometry is rebuilt each frame by mutating the existing
// TubeGeometry's positions buffer rather than reallocating — keeps GC
// off the hot path. The reference chart's heavy rectangular line
// thickness is matched via lineRadius.

import { SIZES, COLOURS, ANIM } from "./proportions.js";

function makeGridMaterial(THREE) {
  return new THREE.LineBasicMaterial({
    color: new THREE.Color(COLOURS.grid),
    transparent: true,
    opacity: 0.55,
  });
}

function makeBackPanel(THREE) {
  // xy plane at z = -frameD/2 (back wall).
  const w = SIZES.frameW, h = SIZES.frameH, t = SIZES.panelThick;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.panelLight),
    roughness: 0.85, metalness: 0.0,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
  mesh.position.set(0, h / 2, -SIZES.frameD / 2);
  mesh.castShadow = false; mesh.receiveShadow = true;
  return mesh;
}

function makeSidePanel(THREE) {
  // yz plane at x = -frameW/2 (left wall, like the y-axis side).
  const h = SIZES.frameH, d = SIZES.frameD, t = SIZES.panelThick;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.panelDark),
    roughness: 0.85, metalness: 0.0,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), mat);
  mesh.position.set(-SIZES.frameW / 2, h / 2, 0);
  mesh.castShadow = false; mesh.receiveShadow = true;
  return mesh;
}

function makeFloorPanel(THREE) {
  // xz plane at y = 0 (floor of the chart).
  const w = SIZES.frameW, d = SIZES.frameD, t = SIZES.panelThick;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.panelMid),
    roughness: 0.85, metalness: 0.0,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), mat);
  mesh.position.set(0, t / 2, 0);
  mesh.castShadow = false; mesh.receiveShadow = true;
  return mesh;
}

function makeBackGrid(THREE) {
  // Horizontal lines across the back wall — 5 ticks (matches reference).
  const w = SIZES.frameW, h = SIZES.frameH;
  const z = -SIZES.frameD / 2 + SIZES.panelThick / 2 + 0.001;
  const group = new THREE.Group();
  const mat = makeGridMaterial(THREE);
  const ticks = 5;
  for (let i = 1; i <= ticks; i++) {
    const yi = (i / (ticks + 1)) * h;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-w / 2 + 0.005, yi, z),
      new THREE.Vector3( w / 2 - 0.005, yi, z),
    ]);
    group.add(new THREE.Line(geom, mat));
  }
  return group;
}

function makeFloorGrid(THREE) {
  // Lines running along z (back-to-front) at evenly spaced x — these
  // read as the year-tick lines on the floor.
  const w = SIZES.frameW, d = SIZES.frameD;
  const y = SIZES.panelThick + 0.001;
  const group = new THREE.Group();
  const mat = makeGridMaterial(THREE);
  const cols = SIZES.pointCount;
  for (let i = 0; i < cols; i++) {
    const t = i / (cols - 1);
    const xi = -w / 2 + SIZES.padX + t * (w - 2 * SIZES.padX);
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(xi, y, -d / 2 + 0.005),
      new THREE.Vector3(xi, y,  d / 2 - 0.005),
    ]);
    group.add(new THREE.Line(geom, mat));
  }
  return group;
}

function makePedestal(THREE) {
  const r = SIZES.pedestalR, h = SIZES.pedestalH;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.pedestal),
    roughness: 0.8, metalness: 0.1,
  });
  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, h, 40),
    mat,
  );
  // Sit just below y=0 so the chart's floor panel rests on top of it.
  ped.position.y = -h / 2;
  ped.castShadow = true;
  ped.receiveShadow = true;
  return ped;
}

// Compute (x, y, z) for the i-th data-point given current values[].
function pointForIndex(THREE, i, values) {
  const w = SIZES.frameW;
  const h = SIZES.frameH;
  const d = SIZES.frameD;
  const t = i / (SIZES.pointCount - 1);
  const x = -w / 2 + SIZES.padX + t * (w - 2 * SIZES.padX);
  const y = SIZES.padY + values[i] * (h - 2 * SIZES.padY);
  // Sit just in front of the back wall so the line reads against
  // the gridded panel like the reference.
  const z = -d / 2 + SIZES.padZ;
  return new THREE.Vector3(x, y, z);
}

function buildLineMesh(THREE, values) {
  const points = [];
  for (let i = 0; i < SIZES.pointCount; i++) {
    points.push(pointForIndex(THREE, i, values));
  }
  // CatmullRom for the curved-segment look that matches a thick polyline
  // with rounded corners, like the reference.
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.05);
  const tubeSeg = (SIZES.pointCount - 1) * 12;
  const geom = new THREE.TubeGeometry(curve, tubeSeg, SIZES.lineRadius, 8, false);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.line),
    roughness: 0.35, metalness: 0.55,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  // Stash the values + curve for the onSpawn animator to mutate.
  mesh.userData.chartValues = values.slice();
  mesh.userData.tubeSeg = tubeSeg;
  return mesh;
}

// Generate a fresh target value set. monotonicBias of the time the
// values trend upward (matches the OW reference's optimistic curve).
function nextTargetValues() {
  const arr = new Array(SIZES.pointCount);
  const upwardTrend = Math.random() < ANIM.monotonicBias;
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

  group.add(makePedestal(THREE));
  group.add(makeFloorPanel(THREE));
  group.add(makeBackPanel(THREE));
  group.add(makeSidePanel(THREE));
  group.add(makeBackGrid(THREE));
  group.add(makeFloorGrid(THREE));

  // Initial values — start near the reference's shape: ascending curve.
  const initial = nextTargetValues();
  const lineMesh = buildLineMesh(THREE, initial);
  group.add(lineMesh);

  // Stash references the onSpawn animator needs to mutate the line each
  // frame without traversing the group.
  group.userData.owChart = {
    lineMesh,
    THREE,
  };
  return group;
}

// Re-export so the def's onSpawn hook can build the next target set.
export { nextTargetValues };
