// Musicity — voxel apartment built with three InstancedMesh instances
// (one per material type). See spec §3.6.

import { generateApartment, GRID, VOXEL_SIZE, PALETTES } from "./proportions.js";

export function buildMesh({ THREE }) {
  const voxels = generateApartment();
  const W = GRID.w, H = GRID.h, D = GRID.d;

  // Three materials — one per type. Initial colours from PALETTES[0].
  // The onSpawn cycle mutates material.color directly, so geometry
  // is not rebuilt across palette changes.
  const wallMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTES[0].wall),
    roughness: 0.65, metalness: 0.05,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTES[0].window),
    transparent: true, opacity: 0.65,
    roughness: 0.2, metalness: 0.4,
    emissive: new THREE.Color(PALETTES[0].window),
    emissiveIntensity: 0.15,
  });
  const balconyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTES[0].balcony),
    roughness: 0.7, metalness: 0.05,
  });

  // Count per type so we can size the InstancedMesh count exactly.
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < voxels.length; i++) counts[voxels[i]]++;

  const cubeGeom = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);

  const wallMesh    = new THREE.InstancedMesh(cubeGeom, wallMat,    Math.max(1, counts[1]));
  const windowMesh  = new THREE.InstancedMesh(cubeGeom, windowMat,  Math.max(1, counts[2]));
  const balconyMesh = new THREE.InstancedMesh(cubeGeom, balconyMat, Math.max(1, counts[3]));
  wallMesh.castShadow = true;    wallMesh.receiveShadow = true;
  balconyMesh.castShadow = true; balconyMesh.receiveShadow = true;
  // Windows shouldn't cast hard shadows.

  // Centre the apartment so its xz centre is at slot origin and base at y=0.
  const offsetX = -((W - 1) * VOXEL_SIZE) / 2;
  const offsetZ = -((D - 1) * VOXEL_SIZE) / 2;
  const offsetY = 0;

  const m = new THREE.Matrix4();
  const cursors = [0, 0, 0, 0];
  for (let z = 0; z < D; z++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const t = voxels[x + W * (y + H * z)];
        if (t === 0) continue;
        // Balcony tiles extrude one voxel forward (z direction).
        const zPush = (t === 3) ? -VOXEL_SIZE : 0;
        m.makeTranslation(
          offsetX + x * VOXEL_SIZE,
          offsetY + y * VOXEL_SIZE,
          offsetZ + z * VOXEL_SIZE + zPush,
        );
        const mesh = t === 1 ? wallMesh : t === 2 ? windowMesh : balconyMesh;
        mesh.setMatrixAt(cursors[t]++, m);
      }
    }
  }
  wallMesh.count = cursors[1];
  windowMesh.count = cursors[2];
  balconyMesh.count = cursors[3];
  wallMesh.instanceMatrix.needsUpdate = true;
  windowMesh.instanceMatrix.needsUpdate = true;
  balconyMesh.instanceMatrix.needsUpdate = true;

  const group = new THREE.Group();
  group.name = "musicity_mesh";
  group.add(wallMesh, windowMesh, balconyMesh);

  // Stash material refs so the onSpawn cycle (and chord) can mutate them
  // without re-traversing.
  group.userData.musicityMats = { wall: wallMat, window: windowMat, balcony: balconyMat };

  return group;
}
