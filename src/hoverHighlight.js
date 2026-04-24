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
  // "pinned" shows up when a body is persistently pinned (via pinSystem)
  // but NOT currently being grabbed. Same blue family as `frozen` but
  // slightly softer so freshly-pinned bodies don't scream for attention.
  pinned: { r: 0.30, g: 0.55, b: 1.00, intensity: 0.55 },
};

export class HoverHighlight {
  constructor(app) {
    this.app = app;
    this.enabled = true;
    // Track which bodyID is currently "lit" so we only diff on change.
    this._currentBodyID = -1;
    this._currentState = null;
    // Comma-joined sorted pinned-body-id list, recomputed each frame. Lets
    // us diff pin-set changes cheaply.
    this._currentPinSig = "";
    // Cache of { material: {origColor: Color, origIntensity: number} }
    this._touchedMats = new Map();
    // Scratch color to avoid allocation.
    this._scratch = new THREE.Color();
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) this._restore();
  }

  // Decide target bodyID + state based on grabber / crosshair / pinSystem.
  //   - Grabbing a pinned body: "frozen" (tightest + loudest tint).
  //   - Grabbing anything else: "grab".
  //   - Hovering a pinned body (no grab): "pinned" treated as hover highlight.
  //   - Hovering a normal body: "hover".
  _resolveTarget() {
    const grabber = this.app.grabber;
    const ps = this.app.pinSystem;
    if (grabber?.active && grabber.bodyID > 0) {
      const state = ps?.isPinned(grabber.bodyID) ? "frozen" : "grab";
      return { bodyID: grabber.bodyID, state };
    }
    const hoverID = this.app.crosshair?.hoveredBodyID ?? -1;
    if (hoverID > 0) {
      return { bodyID: hoverID, state: ps?.isPinned(hoverID) ? "frozen" : "hover" };
    }
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
    const ps = this.app.pinSystem;
    // Snapshot the set of pinned bodies so we can diff against last frame.
    const pinnedNow = ps ? new Set(ps.pins.keys()) : new Set();

    // Fast-path: no change to focus target AND pin membership unchanged.
    const pinSig = Array.from(pinnedNow).sort().join(",");
    if (
      bodyID === this._currentBodyID &&
      state === this._currentState &&
      pinSig === this._currentPinSig
    ) return;

    // Something changed — restore everything and re-apply the current layout.
    this._restore();
    // First apply the soft "pinned" tint to every pinned body EXCEPT the
    // one that will receive the focus tint (to avoid double-tinting a
    // single material and to let focus override).
    for (const pid of pinnedNow) {
      if (pid === bodyID) continue;
      this._apply(pid, "pinned");
    }
    if (bodyID > 0 && state) {
      this._apply(bodyID, state);
    }
    this._currentBodyID = bodyID;
    this._currentState = state;
    this._currentPinSig = pinSig;
  }
}
