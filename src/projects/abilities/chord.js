// Chord ability — flashes Musicity's materials briefly, then restores
// from a colour snapshot taken at flash-time (so the idle palette cycle
// in onSpawn doesn't fight the restore). See spec §3.6 chord handoff note.

import * as THREE from "three";

const DURATION_MS = 1200;
const FLASH_HZ = 3.0;

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
