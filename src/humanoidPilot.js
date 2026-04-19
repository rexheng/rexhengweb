// Humanoid pilot — controls the humanoid through keyboard input when enabled.
//
// Stage 0 (current): control-mode toggle + status chip. No motion yet.
// Next stages will layer on camera rig, root-wrench drive, gait FSM, etc.
//
// Design: pointer-lock gates input routing. When `enabled === true`, this
// module owns WASD + Space + Ctrl + V + G. When false, it's inert and
// everything falls through to the existing grab/orbit/replay systems.

import * as THREE from "three";
import { KeyboardInput } from "./keyboardInput.js";
import { CameraRig } from "./cameraRig.js";

// Stage 2 tunables
const MOVE_ACCEL = 28;        // peak horizontal force per kg of (linear) body mass
const MOVE_DRAG = 4.0;         // damping on pelvis horizontal velocity when no input
const MAX_MOVE_FORCE = 1600;  // absolute cap, N
const TARGET_SPEED = 3.2;     // m/s forward walk cap

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
    this.rig = new CameraRig(app);

    this._pelvisId = -1;      // cached on demand
    this._pelvisMass = 0;     // pelvis body mass (kg)
    this._moveDirMJ = [0, 0]; // last non-zero MJ-frame x,y direction (for future stages)

    this._installStatusChip();
    this._paintStatus();
  }

  _resolvePelvis() {
    if (this._pelvisId > 0) return this._pelvisId;
    const bodies = this.app.bodies;
    if (!bodies) return -1;
    for (const [id, g] of Object.entries(bodies)) {
      if (g?.name === "pelvis") {
        this._pelvisId = Number(id);
        this._pelvisMass = this.app.model?.body_mass?.[this._pelvisId] || 1;
        return this._pelvisId;
      }
    }
    return -1;
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
    if (this.app.controls) {
      this.app.controls.enabled = !this.enabled;
    }
    this.rig.setMode(this.mode);
    this.rig.setActive(this.enabled);
  }

  toggleEnabled() { this.setEnabled(!this.enabled); }

  toggleMode() {
    this.mode = this.mode === "fpv" ? "tpv" : "fpv";
    this.rig.setMode(this.mode);
    this._paintStatus();
  }

  // Called once per animate frame BEFORE stepPhysics.
  update() {
    // G toggles control mode. Works whether enabled or not.
    if (this.input.justPressed("KeyG")) this.toggleEnabled();

    if (this.enabled) {
      if (this.input.justPressed("KeyV")) this.toggleMode();
      // Stages 2+ will consume this.input.axis() / Space / ControlLeft here.
    }

    this.input.nextFrame();
  }

  // Called once per animate frame AFTER syncMeshes (body world transforms up to date).
  updateCamera() {
    if (!this.enabled) return;
    this.rig.update();
  }

  // Stage 2 — horizontal drive via xfrc on the pelvis. Called between
  // applyWind() and grabber.apply() so the wrench isn't zeroed by wind.
  // Grabber still wins on the grabbed body since it runs after.
  //
  // Direction mapping:
  //   THREE world is y-up. Camera forward XZ is (sin(yaw), 0, cos(yaw)).
  //   MuJoCo world is z-up. THREE(x,y,z) → MJ(x, -z, y).
  //   So MJ horizontal plane uses (THREE.x, -THREE.z), which is just
  //   (sin(yaw), -cos(yaw)) for the camera-forward direction in MJ.
  applyDrive() {
    if (!this.enabled) return;
    if (!this.app.data || !this.app.model) return;
    const pid = this._resolvePelvis();
    if (pid < 0) return;

    const ax = this.input.axis();
    const mag = Math.hypot(ax.x, ax.y);
    const hasInput = mag > 0.05;

    const xfrc = this.app.data.xfrc_applied;
    const off = pid * 6;

    if (hasInput) {
      // Camera-forward in MJ horizontal plane. yaw=0 → MJ(+x=sin0=0, MJy=-cos0=-1)
      // so pressing W (ax.y=+1) pushes in MJ -y direction by default. That matches
      // the humanoid facing +y at load (no it doesn't — humanoid root quat is identity
      // meaning local axes equal world, and it faces local +y which in MJ is +y).
      // We just need a consistent frame — camera-forward is what matters for UX.
      const yaw = this.rig.yaw;
      const fwdMJx = Math.sin(yaw);
      const fwdMJy = -Math.cos(yaw);
      // Right = forward rotated -90° around z (MJ up)
      const rightMJx = fwdMJy;
      const rightMJy = -fwdMJx;

      // Normalize input, scale by mass, cap.
      const nx = ax.x / mag;
      const ny = ax.y / mag;

      // Read current pelvis linear velocity in MJ world (cvel layout: [ω, v]).
      const pelvisVx = this.app.data.cvel?.[pid * 6 + 3] || 0;
      const pelvisVy = this.app.data.cvel?.[pid * 6 + 4] || 0;

      // Desired velocity in MJ horizontal plane
      const dvx = (fwdMJx * ny + rightMJx * nx) * TARGET_SPEED;
      const dvy = (fwdMJy * ny + rightMJy * nx) * TARGET_SPEED;
      const errx = dvx - pelvisVx;
      const erry = dvy - pelvisVy;

      // Force proportional to velocity error × mass. Clamp magnitude.
      let fx = errx * MOVE_ACCEL * this._pelvisMass;
      let fy = erry * MOVE_ACCEL * this._pelvisMass;
      const fmag = Math.hypot(fx, fy);
      if (fmag > MAX_MOVE_FORCE) {
        const s = MAX_MOVE_FORCE / fmag;
        fx *= s; fy *= s;
      }
      xfrc[off + 0] = fx;
      xfrc[off + 1] = fy;
      this._moveDirMJ[0] = fwdMJx * ny + rightMJx * nx;
      this._moveDirMJ[1] = fwdMJy * ny + rightMJy * nx;
    } else {
      // Horizontal drag so the character slows to a stop rather than sliding.
      const pelvisVx = this.app.data.cvel?.[pid * 6 + 3] || 0;
      const pelvisVy = this.app.data.cvel?.[pid * 6 + 4] || 0;
      xfrc[off + 0] = -pelvisVx * MOVE_DRAG * this._pelvisMass;
      xfrc[off + 1] = -pelvisVy * MOVE_DRAG * this._pelvisMass;
    }
    // Never write fz here — gravity must stay authoritative so the character
    // can still fall and recover physically.
  }
}
