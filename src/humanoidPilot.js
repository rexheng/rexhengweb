// Humanoid pilot — controls the humanoid through keyboard input when enabled.
//
// Stage 0 (current): control-mode toggle + status chip. No motion yet.
// Next stages will layer on camera rig, root-wrench drive, gait FSM, etc.
//
// Design: pointer-lock gates input routing. When `enabled === true`, this
// module owns WASD + Space + Ctrl + V + G. When false, it's inert and
// everything falls through to the existing grab/orbit/replay systems.

import { KeyboardInput } from "./keyboardInput.js";

const STATUS_CHIP_CSS = `
#fpv-status {
  position: fixed;
  top: 22px;
  left: 220px;
  z-index: 12;
  font-family: var(--rex-font-mono, ui-monospace, monospace);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--rex-ivory-3, #a69d87);
  background: var(--rex-ink, #0b0e16);
  border: 1px solid var(--rex-rule-strong, rgba(214,207,188,0.42));
  padding: 7px 14px;
  pointer-events: none;
  user-select: none;
  display: flex;
  gap: 8px;
  align-items: center;
}
#fpv-status .dot {
  width: 6px;
  height: 6px;
  background: var(--rex-ivory-3, #a69d87);
}
#fpv-status.is-active {
  color: var(--rex-amber, #d4a05a);
  border-color: var(--rex-amber, #d4a05a);
}
#fpv-status.is-active .dot {
  background: var(--rex-amber, #d4a05a);
  animation: fpvPulse 1.4s ease-in-out infinite;
}
@keyframes fpvPulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
`;

export class HumanoidPilot {
  constructor(app) {
    this.app = app;
    this.enabled = false;
    this.mode = "tpv";       // "fpv" | "tpv" — active camera mode when enabled
    this.input = new KeyboardInput();

    this._installStatusChip();
    this._paintStatus();
  }

  _installStatusChip() {
    if (!document.getElementById("fpv-status-style")) {
      const s = document.createElement("style");
      s.id = "fpv-status-style";
      s.textContent = STATUS_CHIP_CSS;
      document.head.appendChild(s);
    }
    const el = document.createElement("div");
    el.id = "fpv-status";
    el.innerHTML = `<span class="dot"></span><span class="label">Control · OFF</span>`;
    document.body.appendChild(el);
    this._chipEl = el;
    this._chipLabelEl = el.querySelector(".label");
  }

  _paintStatus() {
    if (!this._chipEl) return;
    const active = this.enabled;
    this._chipEl.classList.toggle("is-active", active);
    const label = !active
      ? "Control · OFF"
      : this.mode === "fpv"
        ? "Control · FPV"
        : "Control · TPV";
    this._chipLabelEl.textContent = label;
  }

  setEnabled(v) {
    this.enabled = !!v;
    this._paintStatus();
    // Future stages: lock OrbitControls, enter pointer-lock, etc.
    if (this.app.controls) {
      this.app.controls.enabled = !this.enabled;
    }
  }

  toggleEnabled() { this.setEnabled(!this.enabled); }

  toggleMode() {
    this.mode = this.mode === "fpv" ? "tpv" : "fpv";
    this._paintStatus();
  }

  // Called once per animate frame BEFORE stepPhysics.
  update() {
    // G toggles control mode. Works whether enabled or not.
    if (this.input.justPressed("KeyG")) this.toggleEnabled();

    if (this.enabled) {
      // V toggles FPV ↔ TPV
      if (this.input.justPressed("KeyV")) this.toggleMode();
      // Stages 2+ will consume this.input.axis() / Space / ControlLeft here.
    }

    this.input.nextFrame();
  }
}
