// Click-to-drag perturbation — raycast into MuJoCo bodies, apply a spring force
// + torque through data.xfrc_applied while the mouse is held, draw a guide line.
//
// Coordinate frames:
//   THREE world is y-up; MuJoCo world is z-up. The loader swizzles positions via
//   getPosition() as (mj.x, mj.z, -mj.y) → (three.x, three.y, three.z).
//   To send a THREE world vector BACK to MJ world, the inverse swizzle is:
//     (three.x, three.y, three.z) → (mj.x=three.x, mj.y=-three.z, mj.z=three.y)
//
// xfrc_applied is shaped (nbody, 6) row-major: [fx fy fz tx ty tz] in MJ world frame,
// applied at the body's CoM. To pull at a specific grab point, we apply F at CoM
// PLUS torque = r_world × F_world, with r = (grab_world − body_com_world).
import * as THREE from "three";

export class Grabber {
  constructor(app) {
    this.app = app;
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
    this.active = false;
    this.bodyID = -1;
    this.pointerId = -1;
    this.localPoint = new THREE.Vector3();    // grab point in body-local coords
    this.grabPlane = new THREE.Plane();
    this.planeIntersect = new THREE.Vector3();
    this.targetWorld = new THREE.Vector3();
    // GMod physics-gun feel: distance from camera to grab point. Wheel scroll
    // during drag multiplies this to push/pull objects along the view ray.
    this.grabDist = 1.0;
    // Phys-gun rotate: E=clockwise, Q=counter-clockwise around camera-forward axis.
    // Only active while left-dragging a freejoint body.
    this.rotateKey = 0; // -1, 0, +1
    // Pin-drag state: when the user mousedowns on a body that is currently
    // pinned, we mark the grab as "armed". The pin stays enforced until the
    // cursor moves past UNPIN_THRESHOLD_PX, at which point we unpin and let
    // the normal grab spring take over. Stops accidental click-nudges from
    // breaking pins.
    this._pinArmed = false;
    this._downX = 0;
    this._downY = 0;
    // Punt impulse staged from event handler, written into xfrc_applied for
    // one frame from applyPunt() in the render loop (see punt() comment).
    this._pendingPunt = null;

    // scratch
    this._grabWorld = new THREE.Vector3();
    this._comWorld = new THREE.Vector3();
    this._F = new THREE.Vector3();
    this._r = new THREE.Vector3();
    this._tau = new THREE.Vector3();

    const lineMat = new THREE.LineBasicMaterial({ color: 0xffc04d, transparent: true, opacity: 0.95, toneMapped: false });
    const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.line = new THREE.Line(lineGeom, lineMat);
    this.line.visible = false;
    this.line.frustumCulled = false;
    this.line.renderOrder = 999;
    app.scene.add(this.line);

    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffc04d, toneMapped: false });
    this.dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), dotMat);
    this.dot.visible = false;
    this.dot.renderOrder = 999;
    app.scene.add(this.dot);

    // Grab-point marker on the body itself (slightly larger, separate color) for clarity.
    this.grabDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff5533, toneMapped: false }),
    );
    this.grabDot.visible = false;
    this.grabDot.renderOrder = 999;
    app.scene.add(this.grabDot);

    const el = app.renderer.domElement;
    // Listen on window for move/up so drag survives leaving the canvas / crossing GUI.
    el.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
    // GMod physics-gun: wheel during drag pushes / pulls along view ray.
    el.addEventListener("wheel", this.onWheel, { passive: false });
    // Suppress the OS right-click menu so the canvas always feels interactive.
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    // Key bindings: E/Q rotate while dragging · F freezes the currently-held
    // body in mid-air · P punts the body under the crosshair regardless of
    // drag state.
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKeyUp);
    // Block the browser's default image-drag ghost on canvas.
    el.addEventListener("dragstart", (e) => e.preventDefault());
  }

  setMouse(ev) {
    const rect = this.app.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  }

  onDown = (ev) => {
    // Middle-click = GMod gravity-gun punt: instantaneous impulse along camera ray.
    // Handled standalone (no drag), so we short-circuit before the normal grab path.
    if (ev.button === 1) {
      if (!this.app.mujocoRoot || !this.app.data) return;
      this.setMouse(ev);
      this.raycaster.setFromCamera(this.mouseNDC, this.app.camera);
      const hs = this.raycaster.intersectObjects(this.app.getGrabbables(), false);
      if (!hs.length) return;
      this.punt(hs[0]);
      ev.preventDefault();
      return;
    }
    if (ev.button !== 0) return;
    if (!this.app.mujocoRoot || !this.app.data) return;
    this.setMouse(ev);
    this.raycaster.setFromCamera(this.mouseNDC, this.app.camera);
    const hits = this.raycaster.intersectObjects(this.app.getGrabbables(), false);
    if (!hits.length) return;
    const hit = hits[0];
    this.bodyID = hit.object.bodyID;
    this.active = true;
    this.pointerId = ev.pointerId;
    try { this.app.renderer.domElement.setPointerCapture(ev.pointerId); } catch (_) {}
    this.app.controls.enabled = false;

    const bodyGroup = this.app.bodies[this.bodyID];
    bodyGroup.updateWorldMatrix(true, false);
    const invWorld = new THREE.Matrix4().copy(bodyGroup.matrixWorld).invert();
    this.localPoint.copy(hit.point).applyMatrix4(invWorld);

    // Grab plane: parallel to camera image plane, through the hit point.
    // (Still used as a fallback / for reference; main target is ray-distance based.)
    const camDir = new THREE.Vector3();
    this.app.camera.getWorldDirection(camDir);
    this.grabPlane.setFromNormalAndCoplanarPoint(camDir, hit.point);
    this.targetWorld.copy(hit.point);
    // Record initial camera→hit distance so wheel scroll can scale it.
    this.grabDist = this.app.camera.position.distanceTo(hit.point);
    // If this body is currently pinned, arm the unpin-on-move behavior.
    // The pin stays enforced until the cursor drifts past the threshold.
    this._pinArmed = !!this.app.pinSystem?.isPinned(this.bodyID);
    this._downX = ev.clientX;
    this._downY = ev.clientY;

    this.line.visible = true;
    this.dot.visible = true;
    this.grabDot.visible = true;
    this.updateLine(hit.point, hit.point);
    this.grabDot.position.copy(hit.point);

    // Prevent focus stealing / text selection during drag.
    ev.preventDefault();
  };

  onMove = (ev) => {
    if (!this.active) return;
    // Pin-drag: until the cursor moves past the threshold, don't break the
    // pin. Updating targetWorld is fine — the pin's stiffer spring wins
    // while armed. Once we pass the threshold, unpin and let the grab take
    // over normally.
    if (this._pinArmed) {
      const UNPIN_THRESHOLD_PX = 6;
      const dx = ev.clientX - this._downX;
      const dy = ev.clientY - this._downY;
      if ((dx * dx + dy * dy) > UNPIN_THRESHOLD_PX * UNPIN_THRESHOLD_PX) {
        this.app.pinSystem?.unpin(this.bodyID);
        this._pinArmed = false;
      }
    }
    this.setMouse(ev);
    this.raycaster.setFromCamera(this.mouseNDC, this.app.camera);
    // GMod-style: target point = camera_origin + ray_dir * grabDist.
    // grabDist is adjusted by mouse wheel, so scrolling pushes / pulls the body
    // along the view ray instead of locking it to the initial image plane.
    this.targetWorld.copy(this.raycaster.ray.origin)
      .addScaledVector(this.raycaster.ray.direction, this.grabDist);
  };

  onWheel = (ev) => {
    if (!this.active) return;
    ev.preventDefault();
    // Multiplicative zoom so feel stays consistent at any distance.
    // Wheel "up" (negative deltaY) pulls object toward camera.
    const scale = Math.exp(-ev.deltaY * 0.0015);
    this.grabDist = Math.max(0.3, Math.min(30, this.grabDist * scale));
  };

  // GMod gravity-gun punt: one-frame xfrc_applied impulse on the clicked body.
  // Works on any joint type (freejoint props AND articulated humanoid limbs).
  //
  // Critical timing: applyWind() in the render loop zeroes xfrc_applied for every
  // body before stepPhysics(). Writing xfrc directly from this event handler
  // would be erased before mj_step ever sees it. Instead we stash the impulse in
  // _pendingPunt; applyPunt() is called from the render loop AFTER applyWind()
  // and writes the impulse for exactly one frame, so mj_step integrates F·dt
  // into the body's velocity.
  //
  // Impulse magnitude: F = m * SPEED / dt where dt is one physics step. After
  // one step, Δv = F·dt/m = SPEED. The mass floor stops tiny limbs (e.g. 50g
  // hands) from being launched at unreasonable speeds, since Δv = F_floor·dt/m
  // for masses below the floor.
  punt(hit) {
    const bodyID = hit.object.bodyID;
    const model = this.app.model;
    const data = this.app.data;
    if (!model || !data) return;

    // Camera ray direction in THREE world, swizzled to MJ world.
    const camDir = new THREE.Vector3();
    this.app.camera.getWorldDirection(camDir);
    const mjDx = camDir.x;
    const mjDy = -camDir.z;
    const mjDz = camDir.y;

    const SPEED = 12.0;
    const massFloored = Math.max(0.5, model.body_mass?.[bodyID] ?? 1.0);
    const simDt = (model.opt?.timestep ?? 0.002) * (this.app.params?.timescale ?? 1.0);
    const dt = Math.max(0.001, simDt);
    const F = massFloored * SPEED / dt;

    this._pendingPunt = {
      bodyID,
      fx: mjDx * F,
      fy: mjDy * F,
      fz: mjDz * F + massFloored * 30,         // upward bias so things catch air
      tx: (Math.random() - 0.5) * F * 0.15,    // random torque for flair
      ty: (Math.random() - 0.5) * F * 0.15,
      tz: (Math.random() - 0.5) * F * 0.15,
    };

    // Flash the grabDot briefly at hit point as visual feedback.
    this.grabDot.position.copy(hit.point);
    this.grabDot.visible = true;
    this.grabDot.material.color.setHex(0xffffff);
    clearTimeout(this._puntFlashTimer);
    this._puntFlashTimer = setTimeout(() => {
      if (!this.active) {
        this.grabDot.visible = false;
        this.grabDot.material.color.setHex(0xff5533);
      }
    }, 120);
  }

  // Called from the render loop AFTER applyWind() (which zeroes xfrc_applied)
  // and BEFORE stepPhysics(). Writes any pending punt impulse for exactly one
  // frame so mj_step integrates it, then clears the pending state.
  applyPunt() {
    const p = this._pendingPunt;
    if (!p) return;
    const data = this.app.data;
    if (data?.xfrc_applied) {
      const off6 = p.bodyID * 6;
      data.xfrc_applied[off6 + 0] = p.fx;
      data.xfrc_applied[off6 + 1] = p.fy;
      data.xfrc_applied[off6 + 2] = p.fz;
      data.xfrc_applied[off6 + 3] = p.tx;
      data.xfrc_applied[off6 + 4] = p.ty;
      data.xfrc_applied[off6 + 5] = p.tz;
    }
    this._pendingPunt = null;
  }

  // Track E/Q for phys-gun rotate. Ignored unless actively grabbing.
  onKey = (ev) => {
    const tag = (ev.target?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    if (ev.code === "KeyE") this.rotateKey = 1;
    else if (ev.code === "KeyQ") this.rotateKey = -1;
    else if (ev.code === "KeyF") {
      // Toggle-pin: lock the targeted body in world space. If actively
      // grabbing, pin/unpin that body. Otherwise raycast from crosshair and
      // toggle whatever pinned body is under it (enables tap-F-to-unpin
      // without having to drag it).
      this.toggleTargetPin();
    } else if (ev.code === "KeyP") {
      // Punt the body under the crosshair along the camera ray.
      // Works whether or not anything is being held.
      this.puntAtCrosshair();
    }
  };
  onKeyUp = (ev) => {
    if (ev.code === "KeyE" || ev.code === "KeyQ") {
      this.rotateKey = 0;
    }
  };

  // Toggle the persistent pin on whichever body is under the cursor.
  // Preference order:
  //   1. If actively grabbing — pin/unpin the grabbed body.
  //   2. Else raycast from the crosshair NDC; toggle the hit body.
  // After pinning, clear _pinArmed so the current drag doesn't immediately
  // try to unpin it on the next mousemove.
  toggleTargetPin() {
    const ps = this.app.pinSystem;
    if (!ps) return;
    let targetBody = -1;
    if (this.active && this.bodyID > 0) {
      targetBody = this.bodyID;
    } else {
      const ndc = this.app.crosshair?._ndc ?? this.mouseNDC;
      if (!ndc) return;
      this.raycaster.setFromCamera(ndc, this.app.camera);
      const hs = this.raycaster.intersectObjects(this.app.getGrabbables(), false);
      if (!hs.length) return;
      targetBody = hs[0].object.bodyID ?? -1;
    }
    if (targetBody <= 0) return;
    ps.togglePin(targetBody);
    this._pinArmed = false;
  }

  // Punt whatever is under the cursor/crosshair along the camera ray. Uses
  // the same impulse recipe as middle-click punt. Works on any body — the
  // xfrc-based punt propagates through the constraint graph for articulated
  // limbs as well as freejoint props. NDC comes from the crosshair (which
  // tracks the live mouse position) so this works whether or not a drag is
  // in progress.
  puntAtCrosshair() {
    if (!this.app.mujocoRoot || !this.app.data) return;
    const ndc = this.app.crosshair?._ndc ?? this.mouseNDC ?? new THREE.Vector2(0, 0);
    this.raycaster.setFromCamera(ndc, this.app.camera);
    const hs = this.raycaster.intersectObjects(this.app.getGrabbables(), false);
    if (!hs.length) return;
    this.punt(hs[0]);
  }

  onUp = (ev) => {
    if (!this.active) return;
    const releasedBodyID = this.bodyID;
    this.active = false;
    try {
      if (this.pointerId >= 0) this.app.renderer.domElement.releasePointerCapture(this.pointerId);
    } catch (_) {}
    this.pointerId = -1;
    this.bodyID = -1;
    this._pinArmed = false;
    this.app.controls.enabled = true;
    this.line.visible = false;
    this.dot.visible = false;
    this.grabDot.visible = false;
    // Clear per-body xfrc for every body EXCEPT currently-pinned bodies —
    // their pin-spring entries in xfrc_applied must survive this frame or
    // the pin snaps for one tick before pinSystem.apply() reruns.
    const data = this.app.data;
    const ps = this.app.pinSystem;
    if (data) {
      const nbody = this.app.model?.nbody ?? (data.xfrc_applied.length / 6);
      for (let b = 0; b < nbody; b++) {
        if (ps?.isPinned(b)) continue;
        const off = b * 6;
        for (let k = 0; k < 6; k++) data.xfrc_applied[off + k] = 0;
      }
    }
  };

  updateLine(a, b) {
    const pos = this.line.geometry.attributes.position;
    pos.array[0] = a.x; pos.array[1] = a.y; pos.array[2] = a.z;
    pos.array[3] = b.x; pos.array[4] = b.y; pos.array[5] = b.z;
    pos.needsUpdate = true;
    this.dot.position.copy(b);
  }

  apply() {
    if (!this.active || this.bodyID < 0) return;
    const data = this.app.data;
    const bodyGroup = this.app.bodies[this.bodyID];
    if (!data || !bodyGroup) return;

    // Make sure the body's world matrix reflects the latest physics step.
    bodyGroup.updateWorldMatrix(true, false);

    // Current grab-point in THREE world space.
    this._grabWorld.copy(this.localPoint).applyMatrix4(bodyGroup.matrixWorld);
    this.updateLine(this._grabWorld, this.targetWorld);
    this.grabDot.position.copy(this._grabWorld);

    // Body CoM in THREE world space. bodyGroup's own transform IS the body CoM frame
    // for MuJoCo bodies (xpos/xquat drive it). Position of the group = CoM.
    this._comWorld.setFromMatrixPosition(bodyGroup.matrixWorld);

    // Mass-scaled spring with critical-ish damping so every body pulls with the same FEEL
    // regardless of weight. The old constant k/c worked great on 4 kg humanoid limbs but
    // gave 45,000 m/s² accelerations on 20 g balloons — instant sim explosion.
    //
    // Dynamics we want: the grab point should reach target with a natural frequency
    // ω = sqrt(k/m). Fixing ω ≈ 11 rad/s (≈0.57s period) and damping ratio ζ ≈ 0.7
    // gives k = ω²·m, c = 2·ζ·ω·m.
    const mass = Math.max(0.01, this.app.model?.body_mass?.[this.bodyID] ?? 1.0);
    const omega = 14.0;        // natural frequency, rad/s — sets "snappiness"
    const zeta = 0.7;          // damping ratio (1 = critical)
    const k = omega * omega * mass;
    const c = 2 * zeta * omega * mass;
    // Force cap: high enough to lift multi-body articulated systems (humanoid ≈ 41 kg
    // total, individual torso only 5.85 kg — gravity on full system at a grabbed limb
    // is ~400 N and the old 263 N cap could only drag, not lift). 120·mass gives the
    // grabbed limb enough authority to yank the whole ragdoll airborne.
    const cap = 120 * mass;

    // Read linear vel from data.cvel. MJ layout: cvel[body*6 + 0..2]=angular, +3..5=linear,
    // both in MJ world frame. Swizzle linear MJ→THREE: (vx, vz, -vy).
    const off6 = this.bodyID * 6;
    let vLinX = 0, vLinY = 0, vLinZ = 0;
    if (data.cvel && data.cvel.length >= off6 + 6) {
      const mjVx = data.cvel[off6 + 3];
      const mjVy = data.cvel[off6 + 4];
      const mjVz = data.cvel[off6 + 5];
      vLinX = mjVx;
      vLinY = mjVz;
      vLinZ = -mjVy;
    }

    // Delta in THREE world.
    const dx = this.targetWorld.x - this._grabWorld.x;
    const dy = this.targetWorld.y - this._grabWorld.y;
    const dz = this.targetWorld.z - this._grabWorld.z;

    let fx = k * dx - c * vLinX;
    let fy = k * dy - c * vLinY;
    let fz = k * dz - c * vLinZ;
    const mag = Math.hypot(fx, fy, fz);
    if (mag > cap) {
      const s = cap / mag;
      fx *= s; fy *= s; fz *= s;
    }
    this._F.set(fx, fy, fz);

    // Swizzle THREE world force -> MJ world force: (x, y, z)_three -> (x, -z, y)_mj
    const mjFx = fx;
    const mjFy = -fz;
    const mjFz = fy;

    // Lever arm from CoM to grab point, in THREE world, then swizzle to MJ world.
    // CLAMP: the visible mesh on project sprites (Republic column, Peter emblems,
    // etc.) extends well beyond the physics body's collision capsule. Without
    // clamping, grabbing the abacus of a 1.5m-tall column produces torque =
    // 1.5m × 300N = 450 N·m on an auto-derived inertia of ~0.05 kg·m² for the
    // 0.44m capsule — angular accel ≈9000 rad/s², which manifests as runaway
    // spin and integrator glitching. We cap |r| to MAX_LEVER so the grab still
    // tracks the visual point (the spring force is unchanged) but can't produce
    // torque beyond what the real physics body can absorb. Humanoid limbs have
    // visual ≈ physical extent, so this cap never fires in the humanoid path.
    const MAX_LEVER = 0.5;  // ~slot capsule half-length + radius; generous for humanoid limbs too
    let rx_t = this._grabWorld.x - this._comWorld.x;
    let ry_t = this._grabWorld.y - this._comWorld.y;
    let rz_t = this._grabWorld.z - this._comWorld.z;
    const rLen = Math.hypot(rx_t, ry_t, rz_t);
    if (rLen > MAX_LEVER) {
      const s = MAX_LEVER / rLen;
      rx_t *= s; ry_t *= s; rz_t *= s;
    }
    const mjRx = rx_t;
    const mjRy = -rz_t;
    const mjRz = ry_t;

    // Torque = r × F (MJ world frame).
    const mjTx = mjRy * mjFz - mjRz * mjFy;
    const mjTy = mjRz * mjFx - mjRx * mjFz;
    const mjTz = mjRx * mjFy - mjRy * mjFx;

    data.xfrc_applied[off6 + 0] = mjFx;
    data.xfrc_applied[off6 + 1] = mjFy;
    data.xfrc_applied[off6 + 2] = mjFz;
    data.xfrc_applied[off6 + 3] = mjTx;
    data.xfrc_applied[off6 + 4] = mjTy;
    data.xfrc_applied[off6 + 5] = mjTz;

    // Phys-gun rotate: E/Q torque around body-local axes.
    // E = body local-X axis, Q = body local-Z axis.
    // Uses xfrc torque accumulation (adds to existing grab torque) so it
    // coexists with the spring rather than fighting it via qvel overwrite.
    // data.xmat is row-major 3×3 per body (9 floats), in MJ world frame:
    //   col0 = local-X, col1 = local-Y, col2 = local-Z  (each col = 3 rows).
    if (this.rotateKey !== 0) {
      const xmat = data.xmat;
      if (xmat && xmat.length >= (this.bodyID + 1) * 9) {
        const base = this.bodyID * 9;
        // E key → body local-X axis (column 0 of xmat).
        // Q key → body local-Z axis (column 2 of xmat).
        // rotateKey: +1 = E, -1 = Q.
        let axMx, axMy, axMz;
        if (this.rotateKey > 0) {
          axMx = xmat[base + 0];
          axMy = xmat[base + 3];
          axMz = xmat[base + 6];
        } else {
          axMx = xmat[base + 2];
          axMy = xmat[base + 5];
          axMz = xmat[base + 8];
        }
        const TORQUE = 8.0; // N·m
        data.xfrc_applied[off6 + 3] += axMx * TORQUE;
        data.xfrc_applied[off6 + 4] += axMy * TORQUE;
        data.xfrc_applied[off6 + 5] += axMz * TORQUE;
      }
    }
  }
}
