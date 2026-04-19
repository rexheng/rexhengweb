// Camera rig for FPV + TPV modes. Owns pointer-lock, mouse yaw/pitch
// accumulation, and writes camera.position + camera.quaternion directly.
//
// Engaged only when HumanoidPilot is active. OrbitControls is disabled by
// the pilot while we own the camera. On disengage we restore the camera
// transform so OrbitControls resumes smoothly.

import * as THREE from "three";

const PITCH_CLAMP = (89 * Math.PI) / 180;
const MOUSE_SENSITIVITY = 0.0022;   // radians per pixel of movementX/Y
const FPV_HEAD_OFFSET = new THREE.Vector3(0, 0.04, 0.06);   // camera nudged forward of head center
const TPV_DEFAULT_RADIUS = 3.2;
const TPV_MIN_RADIUS = 1.0;
const TPV_MAX_RADIUS = 6.0;
const TPV_LOOK_HEIGHT = 1.15;      // look at (torso.xyz + (0, LOOK_HEIGHT, 0))
const SMOOTH_ALPHA = 0.28;         // per-frame lerp for position smoothing

export class CameraRig {
  constructor(app) {
    this.app = app;
    this.active = false;
    this.mode = "tpv";

    this.yaw = 0;    // around world +Y
    this.pitch = 0;  // -x-axis tilt; clamped

    this._tpvRadius = TPV_DEFAULT_RADIUS;
    this._smoothedPos = new THREE.Vector3();
    this._smoothedTarget = new THREE.Vector3();
    this._tmpVec = new THREE.Vector3();
    this._tmpVec2 = new THREE.Vector3();
    this._tmpEuler = new THREE.Euler(0, 0, 0, "YXZ");

    // Saved camera state for restoration
    this._savedPos = new THREE.Vector3();
    this._savedTarget = new THREE.Vector3();

    // Mouse delta (consumed each frame)
    this._dx = 0;
    this._dy = 0;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onCanvasClick = this._onCanvasClick.bind(this);

    document.addEventListener("pointerlockchange", this._onPointerLockChange);
    document.addEventListener("mousemove", this._onMouseMove);
    addEventListener("wheel", this._onWheel, { passive: false });
  }

  setActive(v) {
    if (this.active === v) return;
    this.active = v;
    if (v) {
      // Snapshot current camera pose for restoration on exit.
      this._savedPos.copy(this.app.camera.position);
      this._savedTarget.copy(this.app.controls.target);
      // Seed yaw from current camera direction so the view doesn't jump.
      const dir = new THREE.Vector3();
      this.app.camera.getWorldDirection(dir);
      this.yaw = Math.atan2(dir.x, dir.z) + Math.PI; // align so yaw=0 faces +z
      this.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
      // Attach click-to-lock on the canvas.
      this.app.renderer.domElement.addEventListener("click", this._onCanvasClick);
    } else {
      if (document.pointerLockElement) document.exitPointerLock?.();
      this.app.renderer.domElement.removeEventListener("click", this._onCanvasClick);
      // Restore camera so OrbitControls resumes coherently.
      this.app.camera.position.copy(this._savedPos);
      this.app.controls.target.copy(this._savedTarget);
      this.app.camera.lookAt(this._savedTarget);
    }
  }

  setMode(m) {
    if (m === this.mode) return;
    this.mode = m;
    // Re-seed smoothed positions so the mode switch doesn't snap.
    this._smoothedPos.copy(this.app.camera.position);
  }

  _onCanvasClick() {
    if (!this.active) return;
    if (document.pointerLockElement !== this.app.renderer.domElement) {
      this.app.renderer.domElement.requestPointerLock?.();
    }
  }

  _onPointerLockChange() {
    // If we exit pointer lock while control mode is on, the user can click to re-lock.
    // If they hit G, pilot.setEnabled(false) takes over.
  }

  _onMouseMove(e) {
    if (!this.active) return;
    if (document.pointerLockElement !== this.app.renderer.domElement) return;
    this._dx += e.movementX || 0;
    this._dy += e.movementY || 0;
  }

  _onWheel(e) {
    if (!this.active || this.mode !== "tpv") return;
    if (document.pointerLockElement !== this.app.renderer.domElement) return;
    e.preventDefault();
    // Scroll to zoom in TPV.
    const k = Math.exp(e.deltaY * 0.0012);
    this._tpvRadius = THREE.MathUtils.clamp(this._tpvRadius * k, TPV_MIN_RADIUS, TPV_MAX_RADIUS);
  }

  // Consume accumulated mouse delta into yaw/pitch. Called each frame.
  _consumeMouse() {
    if (this._dx === 0 && this._dy === 0) return;
    this.yaw -= this._dx * MOUSE_SENSITIVITY;
    this.pitch -= this._dy * MOUSE_SENSITIVITY;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -PITCH_CLAMP, PITCH_CLAMP);
    this._dx = 0;
    this._dy = 0;
  }

  // Returns the world-space "forward" vector on the XZ plane corresponding to
  // the current yaw. Used by HumanoidPilot to translate WASD into camera-frame.
  forwardXZ(out = new THREE.Vector3()) {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();
  }

  // Main per-frame update. Writes camera pose from rig state.
  update() {
    if (!this.active) return;
    this._consumeMouse();
    const cam = this.app.camera;
    const head = this._getHeadWorldPos(this._tmpVec);
    const torso = this._getTorsoWorldPos(this._tmpVec2);

    if (this.mode === "fpv") {
      // Camera sits at head position + a small forward nudge along the gaze.
      const forward = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch),
      );
      const desiredPos = head.clone().add(
        new THREE.Vector3(
          forward.x * FPV_HEAD_OFFSET.z,
          FPV_HEAD_OFFSET.y,
          forward.z * FPV_HEAD_OFFSET.z,
        ),
      );
      if (this._smoothedPos.lengthSq() === 0) this._smoothedPos.copy(desiredPos);
      this._smoothedPos.lerp(desiredPos, SMOOTH_ALPHA);
      cam.position.copy(this._smoothedPos);
      const lookAt = this._smoothedPos.clone().add(forward);
      cam.lookAt(lookAt);
    } else {
      // TPV: camera orbits torso at (_tpvRadius, yaw, pitch).
      const lookPoint = torso.clone();
      lookPoint.y += TPV_LOOK_HEIGHT;
      const cosP = Math.cos(this.pitch);
      const offset = new THREE.Vector3(
        -Math.sin(this.yaw) * cosP * this._tpvRadius,
        Math.sin(this.pitch) * this._tpvRadius + 0.2,
        -Math.cos(this.yaw) * cosP * this._tpvRadius,
      );
      const desiredPos = lookPoint.clone().add(offset);
      if (this._smoothedPos.lengthSq() === 0) this._smoothedPos.copy(desiredPos);
      this._smoothedPos.lerp(desiredPos, SMOOTH_ALPHA);
      cam.position.copy(this._smoothedPos);
      this._smoothedTarget.lerp(lookPoint, SMOOTH_ALPHA);
      cam.lookAt(this._smoothedTarget);
    }
  }

  _getHeadWorldPos(out) {
    const headBody = this._findBodyByName("head");
    if (!headBody) return out.set(0, 1.48, 0);
    headBody.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(headBody.matrixWorld);
  }

  _getTorsoWorldPos(out) {
    const torso = this._findBodyByName("torso");
    if (!torso) return out.set(0, 0.9, 0);
    torso.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(torso.matrixWorld);
  }

  _findBodyByName(name) {
    const bodies = this.app.bodies;
    if (!bodies) return null;
    for (const b of Object.values(bodies)) {
      if (b?.name === name) return b;
    }
    return null;
  }

  destroy() {
    document.removeEventListener("pointerlockchange", this._onPointerLockChange);
    document.removeEventListener("mousemove", this._onMouseMove);
    removeEventListener("wheel", this._onWheel);
  }
}
