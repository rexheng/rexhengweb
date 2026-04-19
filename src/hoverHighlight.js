// Per-body emissive highlight driven by crosshair hover + grabber state.
//
// Tints the target body's meshes with a subtle emissive so the user knows
// exactly what they're about to interact with. Zero postprocess cost — just
// material property writes, restored when the target changes.
//
// States (priority: grabbing > hovering > none):
//   - grabbing (grabber.active, not frozen): warm orange emissive
//   - frozen   (grabber.active + frozen):    pale blue
//   - hovering (crosshair.hoveredBodyID > 0): cyan
//
// Implementation: we cache original `.emissive` RGB + `.emissiveIntensity`
// per material the first time we touch it, then restore on change. This is
// safe because MuJoCo bodies share materials rarely in our scenes (per-body
// solid colors), and restoration is deterministic per-material.

import * as THREE from "three";

const HIGHLIGHT = {
  hover:  { r: 0.15, g: 0.60, b: 0.75, intensity: 0.9 },
  grab:   { r: 0.85, g: 0.55, b: 0.15, intensity: 1.1 },
  frozen: { r: 0.25, g: 0.45, b: 0.85, intensity: 0.8 },
};

export class HoverHighlight {
  constructor(app) {
    this.app = app;
    this.enabled = true;
    // Track which bodyID is currently "lit" so we only diff on change.
    this._currentBodyID = -1;
    this._currentState = null;
    // Cache of { material: {origColor: Color, origIntensity: number} }
    this._touchedMats = new Map();
    // Scratch color to avoid allocation.
    this._scratch = new THREE.Color();
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) this._restore();
  }

  // Decide target bodyID + state based on grabber / crosshair.
  _resolveTarget() {
    const grabber = this.app.grabber;
    if (grabber?.active && grabber.bodyID > 0) {
      return { bodyID: grabber.bodyID, state: grabber.frozen ? "frozen" : "grab" };
    }
    const hoverID = this.app.crosshair?.hoveredBodyID ?? -1;
    if (hoverID > 0) return { bodyID: hoverID, state: "hover" };
    return { bodyID: -1, state: null };
  }

  _collectMeshesForBody(bodyID) {
    // Group for the body; walk descendants that match.
    const group = this.app.bodies?.[bodyID];
    if (!group) return [];
    const out = [];
    group.traverse((o) => {
      if (o.isMesh && o.material && o.bodyID === bodyID) out.push(o);
    });
    return out;
  }

  _apply(bodyID, state) {
    const meshes = this._collectMeshesForBody(bodyID);
    const c = HIGHLIGHT[state];
    if (!c) return;
    for (const m of meshes) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        if (!mat || !mat.emissive) continue;
        if (!this._touchedMats.has(mat)) {
          this._touchedMats.set(mat, {
            origColor: mat.emissive.clone(),
            origIntensity: mat.emissiveIntensity ?? 1.0,
          });
        }
        mat.emissive.setRGB(c.r, c.g, c.b);
        mat.emissiveIntensity = c.intensity;
      }
    }
  }

  _restore() {
    for (const [mat, cache] of this._touchedMats) {
      mat.emissive.copy(cache.origColor);
      mat.emissiveIntensity = cache.origIntensity;
    }
    this._touchedMats.clear();
    this._currentBodyID = -1;
    this._currentState = null;
  }

  update() {
    if (!this.enabled) return;
    const { bodyID, state } = this._resolveTarget();
    if (bodyID === this._currentBodyID && state === this._currentState) return;
    // Target changed — restore old, then apply new.
    this._restore();
    if (bodyID > 0 && state) {
      this._apply(bodyID, state);
      this._currentBodyID = bodyID;
      this._currentState = state;
    }
  }
}
