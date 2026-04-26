// ProjectSystem — owns the slot pool, mounted projects, labels, card, abilities.
// See docs/superpowers/specs/2026-04-24-project-sprite-workflow-design.md §3.

import * as THREE from "three";
import { PROJECTS } from "./index.js";
import { findBody } from "./abilities/impulse.js";

const SLOT_COUNT = 8;
const PARKED_Z = -60;                 // matches the XML park position
const SPAWN_RING_MIN = 1.2;           // nearest radius (MJ) from humanoid
const SPAWN_RING_MAX = 2.4;           // farthest radius (MJ)
const SPAWN_HEIGHT = 0.9;             // drop height above ground so they land naturally

export class ProjectSystem {
  constructor(app) {
    this.app = app;
    // Slot pool: each entry is { bodyID, name, group, project: def|null, labelEl|null, meshGroup|null }
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

    // Sprite mesh click → open card. Required so labels-hidden users can
    // still open project cards. Click vs drag gating: ≤200ms and <4px
    // qualifies as a click. Mousedown does NOT consume the event — grab
    // still receives its pointerdown and starts as normal; if the user
    // drags, we fail the click test on mouseup. If the user just clicks,
    // grab releases on mouseup with no displacement and we fire the card.
    let downX = 0, downY = 0, downT = 0, downBtn = -1;
    addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      downX = e.clientX; downY = e.clientY; downT = performance.now(); downBtn = e.button;
    });
    addEventListener("mouseup", (e) => {
      if (e.button !== 0 || downBtn !== 0) return;
      const dt = performance.now() - downT;
      const dx = e.clientX - downX, dy = e.clientY - downY;
      const moved = Math.hypot(dx, dy);
      downBtn = -1;
      if (dt > 200 || moved >= 4) return;     // drag, not click

      // Skip clicks on UI surfaces — labels and the open card already
      // handle their own clicks; the controls panel is its own subtree.
      if (e.target.closest("#project-card")) return;
      if (e.target.closest(".rex-project-label")) return;
      if (e.target.closest("#rex-controls")) return;

      const grabbables = this.app.getGrabbables?.() || [];
      if (!grabbables.length) return;

      // Build a Raycaster from screen-space NDC to the camera.
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
      if (!bodyID || bodyID < 0) return;

      const slot = this.slots.find((s) => s.bodyID === bodyID && s.project);
      if (slot) this.showCard(slot);
    });
  }

  // ── Lifecycle hooks ────────────────────────────────────────────────────
  onSceneLoaded() {
    // Cancel any active tick-based abilities — their scratch meshes may live
    // on the scene root (dispatch) or attached to slot.group (sprint, pulse,
    // swarm). Without this they'd leak across scene reloads.
    for (const a of this._activeAbilities) a.cancel?.();
    this._activeAbilities = [];

    // Clean any prior mounts.
    for (const slot of this.slots) {
      slot.labelEl?.remove();
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
            project: null,
            meshGroup: null,
            labelEl: null,
          });
          break;
        }
      }
    }
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
    let hb = def.hitbox;
    let offset = def.footprintOffset;
    if (!hb || offset == null) {
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      const size = box.getSize(new THREE.Vector3());
      // Three frame: y-up. MJ frame: z-up. Mapping for half-extents:
      //   Three.x → MJ.hx (lateral)
      //   Three.z → MJ.hy (depth)
      //   Three.y → MJ.hz (vertical)
      if (!hb) hb = { hx: size.x / 2, hy: size.z / 2, hz: size.y / 2 };
      // footprintOffset pushes the mesh DOWN by this amount (Three frame)
      // so its lowest point sits at slot.group's local y=0.
      if (offset == null) offset = -box.min.y;
    }

    // Per-project hitbox override. Each slot has a default 0.30×0.30×0.45
    // box geom; resize it so collision matches the actual silhouette
    // instead of the one-size-fits-all default.
    if (hb && this.app.model) {
      const model = this.app.model;
      const geomAdr = model.body_geomadr[slot.bodyID];
      if (geomAdr >= 0) {
        const base = geomAdr * 3;
        model.geom_size[base + 0] = hb.hx;
        model.geom_size[base + 1] = hb.hy;
        model.geom_size[base + 2] = hb.hz;
      }
    }

    if (offset !== 0) mesh.position.y = -offset;
    slot.group.add(mesh);
    slot.meshGroup = mesh;
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
    const ang = Math.random() * Math.PI * 2;
    const r = SPAWN_RING_MIN + Math.random() * (SPAWN_RING_MAX - SPAWN_RING_MIN);
    const mjX = anchorX + Math.cos(ang) * r;
    const mjY = anchorY + Math.sin(ang) * r;
    const mjZ = SPAWN_HEIGHT;

    const model = this.app.model, data = this.app.data;
    const jntAdr = model.body_jntadr[slot.bodyID];
    const qposAdr = model.jnt_qposadr[jntAdr];
    const dofAdr = model.jnt_dofadr[jntAdr];
    data.qpos[qposAdr + 0] = mjX;
    data.qpos[qposAdr + 1] = mjY;
    data.qpos[qposAdr + 2] = mjZ;
    // Random yaw so successive spawns aren't all facing +x.
    const halfYaw = ang * 0.5;
    data.qpos[qposAdr + 3] = Math.cos(halfYaw);
    data.qpos[qposAdr + 4] = 0;
    data.qpos[qposAdr + 5] = 0;
    data.qpos[qposAdr + 6] = Math.sin(halfYaw);
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
    if (slot.meshGroup?.parent) slot.meshGroup.parent.remove(slot.meshGroup);
    slot.meshGroup = null;
    slot.project = null;
    slot.group.visible = false;

    // Teleport the body back far below the floor.
    const model = this.app.model, data = this.app.data;
    const jntAdr = model.body_jntadr[slot.bodyID];
    const qposAdr = model.jnt_qposadr[jntAdr];
    const dofAdr = model.jnt_dofadr[jntAdr];
    data.qpos[qposAdr + 0] = 0;
    data.qpos[qposAdr + 1] = 0;
    data.qpos[qposAdr + 2] = PARKED_Z - slot.bodyID * 0.5;
    data.qpos[qposAdr + 3] = 1;
    data.qpos[qposAdr + 4] = 0;
    data.qpos[qposAdr + 5] = 0;
    data.qpos[qposAdr + 6] = 0;
    for (let k = 0; k < 6; k++) data.qvel[dofAdr + k] = 0;
    this.app.mujoco.mj_forward(model, data);
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

    // Update label positions for mounted slots.
    if (!this.slots.length) return;
    const { camera, renderer } = this.app;
    if (!camera || !renderer) return;
    const halfW = renderer.domElement.clientWidth / 2;
    const halfH = renderer.domElement.clientHeight / 2;

    for (const slot of this.slots) {
      if (!slot.project || !slot.labelEl) continue;
      if (this._labelsHidden) { slot.labelEl.style.display = "none"; continue; }
      slot.group.updateWorldMatrix(true, false);
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

  // ── Card UI ────────────────────────────────────────────────────────────
  showCard(slot) {
    const def = slot.project;
    if (!def) return;
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
