// Center-screen crosshair reticle — GMod/HL2 flavor. Four short ticks around a
// small dot. Reads grabber state each frame: idle (white/dim), hovering a
// grabbable body (cyan), actively grabbing (orange), frozen hold (pale blue).
//
// Pure DOM — cheap, no WebGL overhead, survives post-processing.

import * as THREE from "three";

const STATES = {
  idle:    { color: "#dce6ff", glow: "0 0 0 rgba(0,0,0,0)",          spread: 10 },
  hover:   { color: "#7ee8fa", glow: "0 0 6px rgba(126,232,250,0.8)", spread: 8  },
  grab:    { color: "#ffc04d", glow: "0 0 8px rgba(255,192,77,0.9)",  spread: 12 },
  frozen:  { color: "#9db7ff", glow: "0 0 6px rgba(157,183,255,0.85)",spread: 7  },
};

export class Crosshair {
  constructor(app) {
    this.app = app;
    this.enabled = true;
    this.state = "idle";
    this.hoveredMesh = null;
    this.hoveredBodyID = -1;
    this._frame = 0;
    this._raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2(0, 0); // dead center by default

    // Root element — fixed, centered, pointer-events disabled so it doesn't eat clicks.
    this.root = document.createElement("div");
    this.root.id = "crosshair";
    this.root.style.cssText = `
      position:fixed; left:50%; top:50%;
      transform: translate(-50%, -50%);
      width:32px; height:32px;
      pointer-events:none; user-select:none;
      z-index:9;
    `;
    document.body.appendChild(this.root);

    // Center dot
    this.dot = document.createElement("div");
    this.dot.style.cssText = `
      position:absolute; left:50%; top:50%;
      width:3px; height:3px; margin:-1.5px 0 0 -1.5px;
      border-radius:50%;
      background:#dce6ff;
      transition: background-color 80ms linear, box-shadow 80ms linear;
    `;
    this.root.appendChild(this.dot);

    // 4 ticks: up/down/left/right
    this.ticks = [];
    for (let i = 0; i < 4; i++) {
      const t = document.createElement("div");
      const horizontal = i < 2;
      t.style.cssText = `
        position:absolute;
        ${horizontal ? "width:6px;height:2px;" : "width:2px;height:6px;"}
        background:#dce6ff;
        transition: background-color 80ms linear, transform 120ms cubic-bezier(.2,.8,.2,1);
      `;
      this.root.appendChild(t);
      this.ticks.push(t);
    }
    this._applyState("idle");

    // Track last mouse NDC so hover-raycast uses real pointer, not screen center.
    this._onPointer = (ev) => {
      const rect = app.renderer.domElement.getBoundingClientRect();
      this._ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      this._ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      // Move the crosshair to follow the mouse.
      this.root.style.left = `${ev.clientX}px`;
      this.root.style.top = `${ev.clientY}px`;
    };
    window.addEventListener("pointermove", this._onPointer);
  }

  setEnabled(v) {
    this.enabled = v;
    this.root.style.display = v ? "" : "none";
  }

  _applyState(name) {
    if (name === this.state) return;
    this.state = name;
    const s = STATES[name];
    this.dot.style.background = s.color;
    this.dot.style.boxShadow = s.glow;
    const spread = s.spread;
    // ticks arranged: 0=left, 1=right, 2=up, 3=down
    const placements = [
      { left: `${16 - spread - 6}px`, top: "15px" },
      { left: `${16 + spread}px`,      top: "15px" },
      { left: "15px", top: `${16 - spread - 6}px` },
      { left: "15px", top: `${16 + spread}px` },
    ];
    for (let i = 0; i < 4; i++) {
      this.ticks[i].style.background = s.color;
      this.ticks[i].style.left = placements[i].left;
      this.ticks[i].style.top = placements[i].top;
    }
  }

  update() {
    if (!this.enabled) return;
    this._frame++;

    // Priority: active grab > hover > idle. Throttle hover raycast to ~20 Hz.
    const grabber = this.app.grabber;
    if (grabber?.active) {
      this._applyState(grabber.frozen ? "frozen" : "grab");
      return;
    }

    if (this._frame % 3 !== 0) return;

    // Hover raycast — only meshes with bodyID > 0 are grabbable.
    if (!this.app.mujocoRoot || !this.app.camera) {
      this._applyState("idle");
      return;
    }
    this._raycaster.setFromCamera(this._ndc, this.app.camera);
    const hit = this._raycaster.intersectObjects(this.app.getGrabbables(), false)[0];
    this.hoveredMesh = hit?.object ?? null;
    this.hoveredBodyID = this.hoveredMesh?.bodyID ?? -1;
    this._applyState(hit ? "hover" : "idle");
  }
}
