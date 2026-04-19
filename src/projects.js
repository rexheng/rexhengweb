// Portfolio projects as spawnable, interactable objects in the MuJoCo scene.
//
// Design:
//   - The MJCF pre-declares a pool of "project_slot_N" bodies parked far below
//     the floor (z=-60). Each slot is a generic freejoint capsule.
//   - The user clicks "Add Project" in the controls panel. ProjectSystem claims
//     the next free slot, teleports it to a random position near the humanoid,
//     attaches a procedural Three.js mesh group on top (visual), and registers
//     a floating screen-space label + info card.
//   - Each project definition can supply its own `ability(ctx)` function which
//     runs a scripted per-frame physics effect for a short window. For Amogus,
//     ability = sudden forward lunge toward the humanoid torso with a spin
//     (approximating a knife stab).

import * as THREE from "three";

const SLOT_COUNT = 8;
const PARKED_Z = -60;                 // matches the XML park position
const SPAWN_RING_MIN = 1.2;           // nearest radius (MJ) from humanoid
const SPAWN_RING_MAX = 2.4;           // farthest radius (MJ)
const SPAWN_HEIGHT = 0.9;             // drop height above ground so they land naturally

// ──────────────────────────────────────────────────────────────────────────
// Project registry.
// ──────────────────────────────────────────────────────────────────────────
export const PROJECTS = [
  {
    id: "amogus",
    label: "Amogus",
    subtitle: "2024 · a sus little guy",
    meta: "three.js · procedural",
    abilityLabel: "Stab!",
    description:
      "Red Among Us crewmate as a physics-enabled prop. Built procedurally in Three.js — rounded torso, cyan fresnel visor, two stub legs, backpack with a glowing antenna. Click Stab! to make him lunge at the humanoid in a spinning forward-stab.",
    links: [
      { label: "Source", href: "#" },
    ],
    accent: "#e25d63",
    buildMesh: buildAmogus,
    ability: stabAbility,
  },
];

// ──────────────────────────────────────────────────────────────────────────
// Amogus — procedural mesh.
// MuJoCo body is z-up in its local frame; the loader rotates the group so
// local +y points "up the torso" in THREE space. All positions below use
// that convention.
// ──────────────────────────────────────────────────────────────────────────

function buildAmogus() {
  const group = new THREE.Group();
  group.name = "amogus_mesh";

  const red = new THREE.MeshPhysicalMaterial({
    color: 0xd94a52,
    roughness: 0.62,
    metalness: 0.04,
    clearcoat: 0.28,
    clearcoatRoughness: 0.5,
  });
  const darkRed = new THREE.MeshStandardMaterial({
    color: 0x7a2228,
    roughness: 0.75,
    metalness: 0.05,
  });
  const visorGlass = new THREE.MeshPhysicalMaterial({
    color: 0x7ad5e0,
    roughness: 0.12,
    metalness: 0.1,
    transmission: 0.55,
    thickness: 0.4,
    ior: 1.35,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.2,
  });
  const visorFrame = new THREE.MeshStandardMaterial({
    color: 0x2a3844,
    roughness: 0.6,
    metalness: 0.2,
  });

  // Torso — scaled sphere bean
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.26, 40, 32), red);
  torso.scale.set(1, 1.55, 1);
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Dark band at base for grounding
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.018, 16, 48), darkRed);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.22;
  rim.castShadow = true;
  group.add(rim);

  // Visor
  const visorGroup = new THREE.Group();
  visorGroup.position.set(0, 0.08, 0.205);

  const frameGeo = new THREE.BoxGeometry(0.28, 0.14, 0.06);
  frameGeo.translate(0, 0, -0.015);
  const frame = new THREE.Mesh(frameGeo, visorFrame);
  frame.castShadow = true;
  visorGroup.add(frame);

  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    visorGlass,
  );
  glass.scale.set(0.12, 0.055, 0.05);
  glass.rotation.x = -Math.PI / 2;
  glass.position.set(0, 0, 0.01);
  visorGroup.add(glass);

  const highlight = new THREE.Mesh(
    new THREE.PlaneGeometry(0.07, 0.012),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.0,
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.85,
    }),
  );
  highlight.position.set(-0.06, 0.02, 0.035);
  highlight.rotation.z = -0.18;
  visorGroup.add(highlight);
  group.add(visorGroup);

  // Stub legs
  for (const sign of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.14), darkRed);
    leg.position.set(sign * 0.10, -0.29, -0.01);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
  }

  // Backpack
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.20, 0.11), red);
  pack.position.set(0, 0.03, -0.21);
  pack.castShadow = true;
  pack.receiveShadow = true;
  group.add(pack);

  // Antenna
  const antennaBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.04, 12),
    visorFrame,
  );
  antennaBase.position.set(0.05, 0.16, -0.21);
  antennaBase.castShadow = true;
  group.add(antennaBase);

  const antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffe4a8,
      emissive: 0xffc860,
      emissiveIntensity: 1.2,
      metalness: 0.2,
      roughness: 0.3,
    }),
  );
  antennaTip.position.set(0.05, 0.19, -0.21);
  group.add(antennaTip);

  return group;
}

// ──────────────────────────────────────────────────────────────────────────
// Abilities — scripted per-frame effects, keyed off a duration timer.
// Each ability is invoked once (on button click) with a context object
// { app, slot, durationMs }. It returns an object with a `tick(dt)` method
// that fires every frame until the duration elapses, then cleans up.
// ──────────────────────────────────────────────────────────────────────────

function stabAbility({ app, slot }) {
  // Read humanoid torso world position + current slot world position.
  const torso = _findBodyByName(app, "torso");
  if (!torso) return { tick() { return false; } };

  const torsoPos = new THREE.Vector3();
  torso.updateWorldMatrix(true, false);
  torsoPos.setFromMatrixPosition(torso.matrixWorld);

  const slotPos = new THREE.Vector3();
  slot.group.updateWorldMatrix(true, false);
  slotPos.setFromMatrixPosition(slot.group.matrixWorld);

  // Direction from slot → torso in THREE world, swizzled to MJ world.
  // THREE → MJ: (x, y, z) → (x, -z, y).
  const dir = torsoPos.clone().sub(slotPos).normalize();
  const mjDx = dir.x;
  const mjDy = -dir.z;
  const mjDz = dir.y;

  // Impulse: fast lunge at ~14 m/s with a small upward bias + hefty spin.
  const model = app.model, data = app.data;
  const jntAdr = model.body_jntadr[slot.bodyID];
  const dofAdr = model.jnt_dofadr[jntAdr];
  const SPEED = 14.0;
  data.qvel[dofAdr + 0] = mjDx * SPEED;
  data.qvel[dofAdr + 1] = mjDy * SPEED;
  data.qvel[dofAdr + 2] = mjDz * SPEED + 2.5; // upward bias so it launches cleanly
  // Spin axis roughly perpendicular to lunge direction — tumble forward.
  const perpAxisX = -mjDy;
  const perpAxisY = mjDx;
  data.qvel[dofAdr + 3] = perpAxisX * 18;
  data.qvel[dofAdr + 4] = perpAxisY * 18;
  data.qvel[dofAdr + 5] = (Math.random() - 0.5) * 6;

  // No per-frame tick needed — it's a one-shot impulse. Return immediately.
  return { tick() { return false; } };
}

// ──────────────────────────────────────────────────────────────────────────
// ProjectSystem — owns the slot pool + mounted projects + abilities.
// ──────────────────────────────────────────────────────────────────────────

export class ProjectSystem {
  constructor(app) {
    this.app = app;
    // Slot pool: each entry is { bodyID, name, group, project: def|null, labelEl|null, meshGroup|null }
    this.slots = [];
    this.activeCard = null;
    this._activeAbilities = []; // {tick, ttlMs}
    this._worldPos = new THREE.Vector3();
    this._screenVec = new THREE.Vector3();

    this._installLabelHost();
    this._installCardRoot();
    this._bindEvents();
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
  }

  // ── Lifecycle hooks ────────────────────────────────────────────────────
  onSceneLoaded() {
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
    slot.group.add(mesh);
    slot.meshGroup = mesh;
    slot.group.visible = true;

    this.app._rebuildGrabbables?.();

    // Teleport the physics body near the humanoid at a random polar offset.
    // Use the torso's current MJ-world position as the anchor; fall back to
    // (0, 0) if we can't locate it.
    let anchorX = 0, anchorY = 0;
    const torsoBody = _findBodyByName(this.app, "torso");
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
    slot.labelEl = labelEl;

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
    this._cardRoot.innerHTML = `
      <header class="rex-ui-card-head">
        <div class="rex-ui-card-index">·</div>
        <div class="rex-ui-card-titles">
          <div class="rex-ui-card-meta">${def.meta || ""}</div>
          <h2>${def.label}</h2>
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
    const fn = def.ability({ app: this.app, slot });
    if (fn && typeof fn.tick === "function") this._activeAbilities.push(fn);
    // Close the card so the user sees the result.
    this.dismissCard();
  }
}

function _findBodyByName(app, name) {
  const bodies = app.bodies;
  if (!bodies) return null;
  for (const b of Object.values(bodies)) if (b?.name === name) return b;
  return null;
}
