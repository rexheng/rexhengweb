// Chord ability — flashes Musicity's materials briefly, then restores
// from a colour snapshot taken at flash-time (so the idle palette cycle
// in onSpawn doesn't fight the restore). See spec §3.6 chord handoff note.

import * as THREE from "three";
import { buildMesh as buildMusicityMesh } from "../catalog/musicity/build.js";
import { GRID, VOXEL_SIZE } from "../catalog/musicity/proportions.js";

const DURATION_MS = 1200;
const FLASH_HZ = 3.0;
const FLANK_SCALE = 0.62;
const FLANK_GAP = VOXEL_SIZE * 0.9;
const FLANK_OFFSET_X = (GRID.w * VOXEL_SIZE * (1 + FLANK_SCALE)) / 2 + FLANK_GAP;
const FLANK_RISE = VOXEL_SIZE * 0.75;
const FLANK_TURN_RAD = 0.14;

function copyMusicityColours(targetMats, sourceColours) {
  for (const key of ["wall", "window", "balcony"]) {
    const mat = targetMats?.[key];
    const colour = sourceColours?.[key];
    if (!mat || !colour) continue;
    mat.color.copy(colour);
    if (key === "window" && mat.emissive) mat.emissive.copy(colour);
  }
}

function disposeObject3D(root) {
  if (!root) return;
  if (root.parent) root.parent.remove(root);
  const geometries = new Set();
  const materials = new Set();
  root.traverse((obj) => {
    if (obj.geometry) geometries.add(obj.geometry);
    if (Array.isArray(obj.material)) {
      for (const mat of obj.material) materials.add(mat);
    } else if (obj.material) {
      materials.add(obj.material);
    }
  });
  for (const geom of geometries) geom.dispose?.();
  for (const mat of materials) mat.dispose?.();
}

function createFlankingApartment(side, colours) {
  const group = buildMusicityMesh({ THREE });
  group.name = side < 0 ? "musicity_flank_left" : "musicity_flank_right";
  group.position.set(side * FLANK_OFFSET_X, 0, 0);
  group.rotation.y = -side * FLANK_TURN_RAD;
  group.scale.setScalar(FLANK_SCALE);
  copyMusicityColours(group.userData?.musicityMats, colours);
  return {
    group,
    mats: group.userData?.musicityMats,
    side,
    baseX: group.position.x,
  };
}

export function chord({ mesh }) {
  if (!mesh) return { tick() { return false; } };

  // Voxel-apartment path (current Musicity).
  const mats = mesh.userData?.musicityMats;
  if (mats) {
    // Snapshot at flash-time so the cycle's mutation doesn't get clobbered.
    const snap = {
      wall: mats.wall.color.clone(),
      window: mats.window.color.clone(),
      balcony: mats.balcony.color.clone(),
    };
    const flanks = [
      createFlankingApartment(-1, snap),
      createFlankingApartment(1, snap),
    ];
    for (const flank of flanks) mesh.add(flank.group);
    let elapsed = 0;
    let disposed = false;
    function restore() {
      if (disposed) return;
      disposed = true;
      // Restore from snapshot — the cycle's tick will overwrite again
      // next frame, which is exactly what we want.
      mats.wall.color.copy(snap.wall);
      mats.window.color.copy(snap.window);
      mats.balcony.color.copy(snap.balcony);
      for (const flank of flanks) disposeObject3D(flank.group);
    }
    const flashCol = new THREE.Color("#ffe8b0");
    return {
      tick(dtMs) {
        if (disposed) return false;
        elapsed += dtMs;
        const t = elapsed / 1000;
        const k = 0.5 + 0.5 * Math.sin(2 * Math.PI * FLASH_HZ * t);
        // Lerp each material colour from its snapshot toward warm white.
        for (const key of ["wall", "window", "balcony"]) {
          mats[key].color.copy(snap[key]).lerp(flashCol, k * 0.6);
        }
        const life = Math.min(1, elapsed / DURATION_MS);
        const pop = Math.sin(Math.PI * life);
        const flankScale = FLANK_SCALE * (1 + pop * 0.14 + k * 0.04);
        for (const flank of flanks) {
          flank.group.scale.setScalar(flankScale);
          flank.group.position.x = flank.baseX + flank.side * VOXEL_SIZE * 0.35 * pop;
          flank.group.position.y = FLANK_RISE * pop;
          flank.group.rotation.y = -flank.side * (FLANK_TURN_RAD + pop * 0.08);
          copyMusicityColours(flank.mats, snap);
          for (const key of ["wall", "window", "balcony"]) {
            flank.mats?.[key]?.color.lerp(flashCol, k * 0.72);
          }
        }
        if (elapsed >= DURATION_MS) {
          restore();
          return false;
        }
        return true;
      },
      cancel() { restore(); },
    };
  }

  // Legacy music-note path (any future caller).
  let note = null;
  mesh.traverse((o) => { if (o.name === "musicity-note") note = o; });
  if (!note) return { tick() { return false; } };
  const baseY = note.userData.baseY ?? note.position.y;
  let mat = note.userData.material;
  if (!mat) note.traverse((o) => { if (o.isMesh && !mat) mat = o.material; });
  const baseEmissive = mat?.emissiveIntensity ?? 0.5;
  let elapsed = 0; let disposed = false;
  function restore() {
    if (disposed) return;
    disposed = true;
    if (note) note.position.y = baseY;
    if (mat) mat.emissiveIntensity = baseEmissive;
  }
  return {
    tick(dtMs) {
      if (disposed) return false;
      elapsed += dtMs;
      const t = elapsed / 1000;
      note.position.y = baseY + 0.30 * Math.sin(2 * Math.PI * 2.0 * t);
      if (mat) mat.emissiveIntensity = 0.4 + 0.4 * Math.sin(2 * Math.PI * 3.0 * t);
      if (elapsed >= 2500) { restore(); return false; }
      return true;
    },
    cancel() { restore(); },
  };
}
