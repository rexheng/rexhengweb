// ProjectSystem — owns the slot pool, mounted projects, labels, card, abilities.
// See docs/superpowers/specs/2026-04-24-project-sprite-workflow-design.md §3.

import * as THREE from "three";
import { PROJECTS } from "./index.js";
import { findBody } from "./abilities/impulse.js";
import { parkSlotBody, setBodyCollision } from "./slotParking.mjs";
import {
  applyBoxCollider,
  applySphereCollider,
  captureSlotCollider,
  normalizeCollider,
  restoreSlotCollider,
} from "./slotCollider.mjs";
import { clearNdcBandX, yawQuatFacing } from "./spawnPlacement.mjs";

const SLOT_COUNT = 8;
const PARKED_Z = 60;                  // matches the XML park position
const SPAWN_RING_MIN = 1.2;           // legacy/fallback nearest radius (MJ)
const SPAWN_RING_MAX = 2.4;           // ring floor for the far guard (MJ)
const SPAWN_ANTI_OVERLAP = 0.4;       // min spawn dist so it clears the avatar
const RING_MAX_HARD = 14;             // absolute far cap (low-angle ray guard)
const SPAWN_HEIGHT = 0.9;             // drop height above ground so they land naturally
const NDC_CAP = 0.55;                 // GUI-bias clear-band cap
const BIAS_MAG = 0.35;                // lateral shove away from the UI panel

// Spawn hint ("double-click me" pill under a freshly spawned sprite;
// "tap the label" on touch, where double-tapping a sprite can't work).
const HINT_DELAY_MS = 500;            // fade in this long after spawn
const HINT_TTL_MS = 6000;             // then start fading out after this long
const HINT_FADE_MS = 450;             // matches the .rex-project-hint opacity transition
const HINT_GAP_PX = 10;               // space between the sprite's lowest point and the pill

const _fwd = new THREE.Vector3();

// Widest clear NDC.x band given the canvas and the #rex-controls panel,
// queried live so it stays correct if the panel moves or differs on mobile.
function clearBandFor(app) {
  const canvas = app.renderer?.domElement;
  if (!canvas) return { min: -NDC_CAP, max: NDC_CAP };
  const c = canvas.getBoundingClientRect();
  const panelEl = document.getElementById("rex-controls");
  let panelRect = null;
  if (panelEl && panelEl.offsetParent !== null) {
    const p = panelEl.getBoundingClientRect();
    if (p.width > 0 && p.right > c.left && p.left < c.right) {
      panelRect = { left: p.left, right: p.right };
    }
  }
  return clearNdcBandX({ left: c.left, width: c.width }, panelRect, NDC_CAP);
}

// Camera-azimuth placement. The scene camera orbits the avatar roughly
// horizontally, so a screen-point→ground raycast grazes the horizon and is
// numerically unstable (hits land behind the camera or kilometres away).
// Instead, place along the camera's forward ground azimuth at a distance
// scaled to the current zoom — deterministic and always in frame. Returns
// null only when there is no camera (caller falls back to legacy random).
function pickSpawnPoint(app, torsoX, torsoY) {
  const camera = app.camera;
  if (!camera) return null;

  const camGX = camera.position.x, camGY = -camera.position.z;

  // Anchor on where the camera is AIMED, not the avatar. The orbit target is
  // screen-centre by construction, so a point there is always visible and
  // scales with zoom for free. The avatar can wander off the look point;
  // visibility must not depend on where it went.
  const tgt = app.controls?.target;
  let lookX, lookY;
  if (tgt) { lookX = tgt.x; lookY = -tgt.z; }
  else {
    camera.getWorldDirection(_fwd);
    lookX = camGX + _fwd.x * 4; lookY = camGY - _fwd.z * 4;
  }

  // Ground direction from camera toward the look point.
  let fx = lookX - camGX, fy = lookY - camGY;
  let lookDist = Math.hypot(fx, fy);
  if (lookDist < 1e-3) {
    camera.getWorldDirection(_fwd);
    fx = _fwd.x; fy = -_fwd.z;
    lookDist = Math.hypot(fx, fy) || 1;
  }
  fx /= lookDist; fy /= lookDist;
  const rx = fy, ry = -fx;            // ground vector perpendicular to forward

  // Sit at the look point, nudged slightly past it (lower in frame) so the
  // avatar at the look point and the new project don't perfectly overlap.
  const fwdOff = lookDist * (0.05 + Math.random() * 0.18);

  // Lateral: shove away from the UI panel (clear-band sign) plus jitter,
  // scaled by zoom so spread shrinks as you zoom in.
  const band = clearBandFor(app);
  const biasSign = (band.min + band.max) >= 0 ? 1 : -1;
  const lat = (biasSign * BIAS_MAG + (Math.random() - 0.5) * 0.5)
            * Math.min(1.2, Math.max(0.25, lookDist * 0.25));

  let px = lookX + fx * fwdOff + rx * lat;
  let py = lookY + fy * fwdOff + ry * lat;

  // Anti-overlap with the avatar: if we landed on the torso, push deeper
  // along the view direction (stays in frame) rather than radially.
  const dT = Math.hypot(px - torsoX, py - torsoY);
  if (dT < SPAWN_ANTI_OVERLAP) {
    const need = SPAWN_ANTI_OVERLAP - dT;
    px += fx * need; py += fy * need;
  }

  // Far guard: never spawn implausibly far from the camera.
  const dCamPt = Math.hypot(px - camGX, py - camGY);
  if (dCamPt > RING_MAX_HARD) {
    px = camGX + (px - camGX) / dCamPt * RING_MAX_HARD;
    py = camGY + (py - camGY) / dCamPt * RING_MAX_HARD;
  }

  const face = yawQuatFacing(px, py, camGX, camGY);
  return { mjX: px, mjY: py, ...face };
}

// Last resort if there is no camera at all: preserve the original
// full-circle random placement rather than failing to spawn.
function legacyRandomPlacement(anchorX, anchorY) {
  const ang = Math.random() * Math.PI * 2;
  const r = SPAWN_RING_MIN + Math.random() * (SPAWN_RING_MAX - SPAWN_RING_MIN);
  const halfYaw = ang * 0.5;
  return {
    mjX: anchorX + Math.cos(ang) * r,
    mjY: anchorY + Math.sin(ang) * r,
    qw: Math.cos(halfYaw), qx: 0, qy: 0, qz: Math.sin(halfYaw),
  };
}

export class ProjectSystem {
  constructor(app) {
    this.app = app;
    // Slot pool: each entry is { bodyID, name, group, project: def|null, labelEl|null, meshGroup|null, hint|null, ... }
    this.slots = [];
    this.activeCard = null;
    this._activeAbilities = []; // {tick, ttlMs}
    this._worldPos = new THREE.Vector3();
    this._screenVec = new THREE.Vector3();
    this._labelsHidden = false;

    this._installLabelHost();
    this._installCardRoot();
    this._bindEvents();
  }

  setLabelsHidden(v) {
    this._labelsHidden = !!v;
    // Apply immediately so the next update() doesn't have to wait for the
    // user to scroll/move to flush the visibility — also makes the toggle
    // feel instant for static cameras.
    for (const slot of this.slots) {
      if (!slot.labelEl) continue;
      slot.labelEl.style.display = this._labelsHidden ? "none" : "";
    }
  }

  // ── DOM scaffolding ────────────────────────────────────────────────────
  _installLabelHost() {
    const host = document.createElement("div");
    host.id = "project-labels";
    host.style.cssText = `position:fixed; inset:0; pointer-events:none; z-index:11;`;
    document.body.appendChild(host);
    this._host = host;
  }

  _installCardRoot() {
    const card = document.createElement("div");
    card.id = "project-card";
    card.className = "rex-ui-card";
    card.style.display = "none";
    document.body.appendChild(card);
    this._cardRoot = card;
  }

  _bindEvents() {
    addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.activeCard) this.dismissCard();
    });
    addEventListener("mousedown", (e) => {
      if (!this.activeCard) return;
      if (e.target.closest("#project-card")) return;
      if (e.target.closest(".rex-project-label")) return;
      this.dismissCard();
    });

    // Sprite mesh double-click → fire the project's ability at once. A
    // single click on a sprite deliberately does nothing beyond the grab it
    // starts; the floating label is the way into the card.
    addEventListener("dblclick", (e) => {
      if (e.target.closest("#project-card")) return;
      if (e.target.closest(".rex-project-label")) return;
      if (e.target.closest("#rex-controls")) return;
      const grabbables = this.app.getGrabbables?.() || [];
      if (!grabbables.length) return;
      const rect = this.app.renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, this.app.camera);
      const hits = raycaster.intersectObjects(grabbables, false);
      if (!hits.length) return;
      const bodyID = hits[0].object.bodyID;
      const slot = this.slots.find((s) => s.bodyID === bodyID && s.project);
      if (slot) this._fireAbility(slot);
    });
  }

  // ── Lifecycle hooks ────────────────────────────────────────────────────
  onSceneLoaded() {
    // Cancel any active tick-based abilities — their scratch meshes may live
    // on the scene root (dispatch) or attached to slot.group (pulse, swarm).
    // Without this they'd leak across scene reloads.
    for (const a of this._activeAbilities) a.cancel?.();
    this._activeAbilities = [];

    // Clean any prior mounts.
    for (const slot of this.slots) {
      slot.labelEl?.remove();
      this._removeHint(slot);
      if (slot.meshGroup?.parent) slot.meshGroup.parent.remove(slot.meshGroup);
    }
    this.slots = [];
    this.dismissCard();

    const bodies = this.app.bodies;
    if (!bodies) return;

    // Index slot bodies by name.
    for (let i = 0; i < SLOT_COUNT; i++) {
      const wantName = `project_slot_${i}`;
      for (const [id, g] of Object.entries(bodies)) {
        if (g?.name === wantName) {
          // Default hidden: the auto-generated loader mesh renders the capsule
          // at z=-60 which is far below the floor, but visible from certain
          // camera angles. Hide the mesh until the slot is claimed.
          g.visible = false;
          this.slots.push({
            bodyID: Number(id),
            name: wantName,
            group: g,
            parkedZ: PARKED_Z + i * 0.5,
            project: null,
            meshGroup: null,
            labelEl: null,
            hint: null,          // spawn hint { el, timers, fading, viaLabel } while shown
            halfExtents: null,   // collider half-extents of the mounted sprite
            // Compiled box geom/inertia, restored on park and before each
            // box spawn so a slot that last held a sphere is a box again.
            colliderDefaults: this.app.model
              ? captureSlotCollider(this.app.model, Number(id))
              : null,
          });
          break;
        }
      }
    }
    this._parkInactiveSlots();
  }

  prePhysicsUpdate() {
    this._parkInactiveSlots();
  }

  postPhysicsUpdate() {
    this._parkInactiveSlots();
  }

  /**
   * Spawn the given project into the next free slot at a random position
   * near the humanoid. Returns the slot, or null if the pool is full or
   * the project id is unknown.
   */
  spawn(projectId) {
    const def = PROJECTS.find((p) => p.id === projectId);
    if (!def) return null;
    const slot = this.slots.find((s) => !s.project);
    if (!slot) return null;

    slot.project = def;

    // Remove the loader's default mesh child(ren); attach procedural mesh.
    const toRemove = [];
    slot.group.traverse((o) => { if (o.isMesh) toRemove.push(o); });
    for (const o of toRemove) {
      o.parent?.remove(o);
      o.geometry?.dispose?.();
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
      else o.material?.dispose?.();
    }
    const mesh = def.buildMesh();
    mesh.traverse((o) => { o.bodyID = slot.bodyID; });

    // Auto-derive hitbox + footprintOffset if the def doesn't supply them.
    // Mesh isn't in the scene yet; force-update its local matrices so
    // Box3.setFromObject sees the correct geometry. We must read the bbox
    // BEFORE adding to slot.group — the slot sits at z=-60 (parked) and
    // would corrupt the bbox.
    //
    // When the body settles on the floor, slot.group's MJ-world position
    // sits at z = hitbox.hz (the geom's half-height — the capsule centre).
    // So slot.group's local y=0 is HALFWAY UP the body, not at the floor.
    // To make the mesh's visible bottom land on the floor, we shift the
    // mesh DOWN by hitbox.hz (so its bottom sits at slot-local y = -hitbox.hz,
    // which is the floor in world space). Then we further compensate for
    // the mesh's own bbox-min so the geometric bottom aligns.
    //
    // Collider shape: the slot's box by default. `def.collider: "sphere"`
    // (or { type: "sphere", radius }) swaps in a ball centred on the mesh
    // bbox; radius defaults to half the bbox's largest extent.
    let collider = normalizeCollider(def.collider);
    if (!collider) {
      console.warn(`[projects] ${def.id}: unknown collider ${JSON.stringify(def.collider)}; using box`);
      collider = { type: "box" };
    }
    const isSphere = collider.type === "sphere";
    let hb = def.hitbox;
    let explicitOffset = def.footprintOffset;
    let boxMinY = 0;
    let boxSize = null;
    let boxCenter = null;
    if (!hb || explicitOffset == null || isSphere) {
      // Compute bbox in MESH-LOCAL frame. We zero mesh.position before
      // updateMatrixWorld so children's world positions equal their
      // mesh-local positions — i.e. box.min.y is the bbox bottom relative
      // to the mesh's own origin, NOT relative to whatever recentre offset
      // the cached scene came with. The y-overwrite below replaces
      // mesh.position.y entirely, so reading boxMinY against the *current*
      // position.y (which preloadModel set to -box.min.y for FBX recentre)
      // would double-count that offset and sink the legs by exactly
      // boxMinY of the original geometry.
      const savedPos = mesh.position.clone();
      mesh.position.set(0, 0, 0);
      mesh.updateMatrixWorld(true);
      // Walk the mesh and union bboxes from rendered geometry only —
      // FBX scenes can carry helper/empty nodes that pollute the bbox.
      const box = new THREE.Box3();
      let any = false;
      mesh.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        const child = new THREE.Box3().setFromObject(o);
        if (Number.isFinite(child.min.x) && Number.isFinite(child.max.x)) {
          if (any) box.union(child); else { box.copy(child); any = true; }
        }
      });
      if (!any) box.setFromObject(mesh);
      const size = box.getSize(new THREE.Vector3());
      boxMinY = box.min.y;
      boxSize = size;
      boxCenter = box.getCenter(new THREE.Vector3());
      // Restore original position; the y component is overwritten below.
      mesh.position.copy(savedPos);
      mesh.updateMatrixWorld(true);
      // Three frame: y-up. MJ frame: z-up. Mapping for half-extents:
      //   Three.x → MJ.hx (lateral)
      //   Three.z → MJ.hy (depth)
      //   Three.y → MJ.hz (vertical)
      if (!hb) hb = { hx: size.x / 2, hy: size.z / 2, hz: size.y / 2 };
    }

    if (isSphere) {
      const r = collider.radius ?? Math.max(boxSize.x, boxSize.y, boxSize.z) / 2;
      hb = { hx: r, hy: r, hz: r };
    }

    // Per-project hitbox override. Each slot has a default 0.30×0.30×0.45
    // box geom; resize it so collision matches the actual silhouette
    // instead of the one-size-fits-all default (or swap in a sphere).
    if (hb && this.app.model) {
      const model = this.app.model;
      slot.colliderDefaults ??= captureSlotCollider(model, slot.bodyID);
      if (isSphere) applySphereCollider(model, slot.bodyID, slot.colliderDefaults, hb.hx);
      else applyBoxCollider(model, slot.bodyID, slot.colliderDefaults, hb);
    }

    // Position mesh so its bottom sits on the floor when the body settles.
    // - Sphere: centre the mesh bbox on the body origin (a ball rolls about
    //   its centre; the body rests at z = radius).
    // - Auto-derived: shift down by hitbox.hz, then up by -boxMinY.
    // - Explicit: legacy convention preserved (mesh.position.y = -offset).
    if (isSphere) {
      mesh.position.set(-boxCenter.x, -boxCenter.y, -boxCenter.z);
    } else if (explicitOffset != null) {
      if (explicitOffset !== 0) mesh.position.y = -explicitOffset;
    } else if (hb) {
      mesh.position.y = -hb.hz - boxMinY;
    }
    slot.group.add(mesh);
    slot.meshGroup = mesh;
    slot.halfExtents = hb;
    slot.group.visible = true;

    this.app._rebuildGrabbables?.();

    // Teleport the physics body near the humanoid at a random polar offset.
    // Use the torso's current MJ-world position as the anchor; fall back to
    // (0, 0) if we can't locate it.
    let anchorX = 0, anchorY = 0;
    const torsoBody = findBody(this.app, "torso");
    if (torsoBody) {
      // torso.matrixWorld is THREE-frame; convert to MJ: (x, y, z)_three → (x, -z, y)_mj
      torsoBody.updateWorldMatrix(true, false);
      const p = new THREE.Vector3().setFromMatrixPosition(torsoBody.matrixWorld);
      anchorX = p.x;
      anchorY = -p.z;
    }
    // FOV-aware placement: aim into the visible, panel-clear frame so the
    // project always appears in front at walking distance, framed for the
    // current zoom. See docs/superpowers/specs/2026-05-15-fov-aware-project-spawn-design.md.
    const place = pickSpawnPoint(this.app, anchorX, anchorY)
                ?? legacyRandomPlacement(anchorX, anchorY);
    const mjX = place.mjX;
    const mjY = place.mjY;
    const mjZ = SPAWN_HEIGHT;

    const model = this.app.model, data = this.app.data;
    const jntAdr = model.body_jntadr[slot.bodyID];
    const qposAdr = model.jnt_qposadr[jntAdr];
    const dofAdr = model.jnt_dofadr[jntAdr];
    setBodyCollision(model, slot.bodyID, { contype: 2, conaffinity: 1 });
    data.qpos[qposAdr + 0] = mjX;
    data.qpos[qposAdr + 1] = mjY;
    data.qpos[qposAdr + 2] = mjZ;
    // Face the camera so the project reads as arriving toward the viewer.
    data.qpos[qposAdr + 3] = place.qw;
    data.qpos[qposAdr + 4] = place.qx;
    data.qpos[qposAdr + 5] = place.qy;
    data.qpos[qposAdr + 6] = place.qz;
    for (let k = 0; k < 6; k++) data.qvel[dofAdr + k] = 0;
    this.app.mujoco.mj_forward(model, data);

    // Floating label.
    const labelEl = document.createElement("button");
    labelEl.type = "button";
    labelEl.className = "rex-project-label";
    labelEl.innerHTML = `
      <span class="rex-project-label-tick"></span>
      <span class="rex-project-label-text">${def.label}</span>
      <span class="rex-project-label-arrow">↗</span>
    `;
    labelEl.style.setProperty("--accent", def.accent || "#d4a05a");
    labelEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showCard(slot);
    });
    this._host.appendChild(labelEl);
    if (this._labelsHidden) labelEl.style.display = "none";
    slot.labelEl = labelEl;

    // Idle hooks — abilities are user-fired; onSpawn is automatic. The
    // returned tick (if any) lives in _activeAbilities with the same
    // _slotBodyID tag _fireAbility uses, so _park can cancel it.
    if (typeof def.onSpawn === "function") {
      const tick = def.onSpawn(slot, { app: this.app, mesh: slot.meshGroup });
      if (tick && typeof tick.tick === "function") {
        tick._slotBodyID = slot.bodyID;
        tick._isIdle = true;
        this._activeAbilities.push(tick);
      }
    }

    return slot;
  }

  /** Return the number of free slots in the pool. */
  freeSlots() {
    return this.slots.filter((s) => !s.project).length;
  }

  /** Remove every mounted project and park all slots. */
  clearAll() {
    for (const slot of this.slots) {
      if (!slot.project) continue;
      this._park(slot);
    }
    this.dismissCard();
  }

  _park(slot) {
    // Cancel any active abilities tied to this slot before tearing down the
    // mesh group — abilities (especially `dispatch`) may have scratch meshes
    // parented to the scene root that survive mesh-group removal.
    if (this._activeAbilities.length) {
      this._activeAbilities = this._activeAbilities.filter((a) => {
        if (a._slotBodyID === slot.bodyID) {
          a.cancel?.();
          return false;
        }
        return true;
      });
    }

    slot.labelEl?.remove();
    slot.labelEl = null;
    this._removeHint(slot);
    if (slot.meshGroup?.parent) slot.meshGroup.parent.remove(slot.meshGroup);
    slot.meshGroup = null;
    slot.halfExtents = null;
    slot.project = null;
    slot.group.visible = false;

    // Teleport the body back far below the floor.
    const model = this.app.model, data = this.app.data;
    // Back to the compiled box (undoes a sphere collider, resets the size).
    if (slot.colliderDefaults) restoreSlotCollider(model, slot.bodyID, slot.colliderDefaults);
    parkSlotBody(model, data, slot.bodyID, slot.parkedZ);
    this.app.mujoco.mj_forward(model, data);
  }

  _parkInactiveSlots() {
    const model = this.app.model, data = this.app.data;
    if (!model || !data) return;
    for (const slot of this.slots) {
      if (slot.project) continue;
      parkSlotBody(model, data, slot.bodyID, slot.parkedZ);
    }
  }

  // ── Per-frame ──────────────────────────────────────────────────────────
  update() {
    // Tick active abilities; cull expired.
    if (this._activeAbilities.length) {
      const dt = 16; // ms, approximate
      this._activeAbilities = this._activeAbilities.filter((a) => {
        const alive = a.tick(dt);
        return alive !== false;
      });
    }

    // Update label (and spawn hint) positions for mounted slots.
    if (!this.slots.length) return;
    const { camera, renderer } = this.app;
    if (!camera || !renderer) return;
    const halfW = renderer.domElement.clientWidth / 2;
    const halfH = renderer.domElement.clientHeight / 2;

    for (const slot of this.slots) {
      if (!slot.project) continue;
      slot.group.updateWorldMatrix(true, false);
      if (slot.hint) this._placeHint(slot, camera, halfW, halfH);
      if (!slot.labelEl) continue;
      if (this._labelsHidden) { slot.labelEl.style.display = "none"; continue; }
      this._worldPos.setFromMatrixPosition(slot.group.matrixWorld);
      this._screenVec.copy(this._worldPos);
      this._screenVec.y += 0.55;
      this._screenVec.project(camera);

      if (this._screenVec.z > 1) {
        slot.labelEl.style.display = "none";
        continue;
      }
      const sx = halfW + this._screenVec.x * halfW;
      const sy = halfH - this._screenVec.y * halfH;
      slot.labelEl.style.display = "";
      slot.labelEl.style.transform =
        `translate(calc(${sx.toFixed(1)}px - 50%), calc(${sy.toFixed(1)}px - 50%))`;
    }
  }

  // ── Spawn hint ─────────────────────────────────────────────────────────
  /**
   * Show a small "double-click me" pill under the slot's sprite (called when
   * a project is spawned from its tile). Purely visual: no pointer events.
   * It fades in after HINT_DELAY_MS and fades out after HINT_TTL_MS, on the
   * slot's first ability fire, or (touch) when the slot's card opens;
   * parking the slot removes it at once.
   */
  showSpawnHint(slot) {
    if (!slot?.project) return;
    this._removeHint(slot);
    // Touch can't double-tap a sprite: the grabber preventDefault()s the
    // touch pointerdown, so the browser never builds a dblclick from the two
    // taps. There the way to the ability is label → card → ability button,
    // so point at the label instead (and fade once its card opens).
    const viaLabel = matchMedia("(pointer: coarse)").matches;
    const text = viaLabel ? "tap the label ↑" : "double-click me";
    const el = document.createElement("div");
    el.className = "rex-project-hint";
    el.setAttribute("aria-hidden", "true");
    el.style.setProperty("--accent", slot.project.accent || "#d4a05a");
    el.innerHTML =
      `<span class="rex-project-hint-pill"><span class="rex-project-hint-dot"></span>${text}</span>`;
    this._host.appendChild(el);
    const hint = { el, timers: [], fading: false, viaLabel };
    hint.timers.push(
      setTimeout(() => el.classList.add("is-visible"), HINT_DELAY_MS),
      setTimeout(() => this._fadeHint(slot), HINT_TTL_MS),
    );
    slot.hint = hint;
  }

  _fadeHint(slot) {
    const hint = slot.hint;
    if (!hint || hint.fading) return;
    hint.fading = true;
    for (const t of hint.timers) clearTimeout(t);
    hint.el.classList.remove("is-visible");
    hint.timers = [setTimeout(() => this._removeHint(slot), HINT_FADE_MS)];
  }

  _removeHint(slot) {
    const hint = slot.hint;
    if (!hint) return;
    for (const t of hint.timers) clearTimeout(t);
    hint.el.remove();
    slot.hint = null;
  }

  // Sit the pill just below the sprite's lowest on-screen point: project the
  // eight corners of the slot's collider box (which hugs the mesh) so it never
  // covers the model, whatever its size, tumble or the camera angle.
  _placeHint(slot, camera, halfW, halfH) {
    const el = slot.hint.el;
    const ext = slot.halfExtents;
    const m = slot.group.matrixWorld;
    const v = this._screenVec;
    v.setFromMatrixPosition(m).project(camera);
    if (!ext || v.z > 1) { el.style.display = "none"; return; }
    const sx = halfW + v.x * halfW;
    let bottom = -Infinity;
    for (let i = 0; i < 8; i++) {
      // Three frame is y-up: hx → x, hz → y (vertical), hy → z (depth).
      v.set(i & 1 ? ext.hx : -ext.hx, i & 2 ? ext.hz : -ext.hz, i & 4 ? ext.hy : -ext.hy)
        .applyMatrix4(m)
        .project(camera);
      if (v.z <= 1) bottom = Math.max(bottom, halfH - v.y * halfH);
    }
    if (bottom === -Infinity) { el.style.display = "none"; return; }
    el.style.display = "";
    el.style.transform =
      `translate(calc(${sx.toFixed(1)}px - 50%), ${(bottom + HINT_GAP_PX).toFixed(1)}px)`;
  }

  // ── Card UI ────────────────────────────────────────────────────────────
  showCard(slot) {
    const def = slot.project;
    if (!def) return;
    if (slot.hint?.viaLabel) this._fadeHint(slot);   // touch hint: label was tapped
    this.activeCard = { slot, def };
    const linksHTML = (def.links || [])
      .map((l) => `<a href="${l.href}" target="_blank" rel="noopener noreferrer">${l.label}</a>`)
      .join("");
    const abilityHTML = def.ability
      ? `<button class="rex-ui-card-ability" type="button">${def.abilityLabel || "Activate"}</button>`
      : "";
    const cardTitle = def.title || def.label;
    this._cardRoot.innerHTML = `
      <header class="rex-ui-card-head">
        <div class="rex-ui-card-index">·</div>
        <div class="rex-ui-card-titles">
          <div class="rex-ui-card-meta">${def.meta || ""}</div>
          <h2>${cardTitle}</h2>
          <div class="rex-ui-card-sub">${def.subtitle || ""}</div>
        </div>
        <button class="rex-ui-card-close" type="button" aria-label="Close">×</button>
      </header>
      <div class="rex-ui-card-body">
        <p>${def.description || ""}</p>
        ${abilityHTML}
      </div>
      ${linksHTML ? `<footer class="rex-ui-card-links">${linksHTML}</footer>` : ""}
    `;
    this._cardRoot.style.setProperty("--accent", def.accent || "#d4a05a");
    this._cardRoot.style.display = "";
    requestAnimationFrame(() => this._cardRoot.classList.add("is-open"));
    this._cardRoot.querySelector(".rex-ui-card-close")
      ?.addEventListener("click", () => this.dismissCard());
    this._cardRoot.querySelector(".rex-ui-card-ability")
      ?.addEventListener("click", () => this._fireAbility(slot));
  }

  dismissCard() {
    if (!this.activeCard) return;
    this.activeCard = null;
    this._cardRoot.classList.remove("is-open");
    setTimeout(() => { this._cardRoot.style.display = "none"; }, 240);
  }

  _fireAbility(slot) {
    const def = slot.project;
    if (!def?.ability) return;
    this._fadeHint(slot);   // the hint has done its job
    // Ability context includes the slot's mesh group so tick-based abilities
    // (pulse, swarm, cycle) can add child meshes, rotate satellite children,
    // or hot-swap materials/emblems without going through the slot object.
    const fn = def.ability({ app: this.app, slot, mesh: slot.meshGroup });
    if (fn && typeof fn.tick === "function") {
      // Tag with the slot bodyID so park can find and cancel its abilities.
      fn._slotBodyID = slot.bodyID;
      this._activeAbilities.push(fn);
    }
    // Close the card so the user sees the result.
    this.dismissCard();
  }
}
