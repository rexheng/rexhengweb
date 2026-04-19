// Portfolio projects as interactable objects inside the MuJoCo scene.
//
// Each project has:
//   - a physics body in the MJCF (capsule, freejoint) named `project_<id>`
//   - a procedural Three.js mesh group that replaces the default auto-generated
//     mesh at that bodyID in the loader's `bodies` map
//   - a floating screen-space label that tracks the body's world position
//   - a click handler that pops an editorial info card
//
// The loader parents `bodies[n]` under `bodies[0]` and drives its position +
// quaternion from MuJoCo each frame via syncMeshes. We hijack that by:
//   1. traversing `bodies[projectBodyID]`, removing its auto-generated children
//      (the default capsule mesh from the MJCF)
//   2. adding our custom Group under the same parent so it inherits the
//      physics-driven transform for free.

import * as THREE from "three";

// ──────────────────────────────────────────────────────────────────────────
// Project registry. First project: Amogus.
// ──────────────────────────────────────────────────────────────────────────
export const PROJECTS = [
  {
    id: "amogus",
    bodyName: "project_amogus",
    label: "Amogus",
    subtitle: "2024 · a sus little guy",
    meta: "three.js · procedural",
    description:
      "A test project — the red Among Us crewmate as a physics-enabled prop in this scene. Built procedurally in Three.js: rounded torso, cyan visor with fresnel tint, two stub legs, and a small backpack. MuJoCo sees it as a single capsule so it tumbles and gets knocked around like any other body. Drag it. Hit it with the humanoid. It's sus.",
    links: [
      { label: "Source", href: "#" },
    ],
    accent: "#e25d63",
    buildMesh: buildAmogus,
  },
];

// ──────────────────────────────────────────────────────────────────────────
// Procedural Amogus mesh.
//
// MuJoCo physics is a Z-up capsule (local z axis = "up" along the torso).
// The loader swizzles each body's pose from MJ (z-up) into THREE (y-up) by
// rotating the body group. So inside the body group's LOCAL frame, +y is the
// MJ-local +z direction (i.e. "up the torso"). Model accordingly.
// ──────────────────────────────────────────────────────────────────────────

function buildAmogus() {
  const group = new THREE.Group();
  group.name = "amogus_mesh";

  // Materials
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

  // Torso — a rounded capsule-like bean. Use a SphereGeometry scaled on y,
  // then fuse with a cylinder to get the flat-bottom Among Us silhouette.
  const torsoGeo = new THREE.SphereGeometry(0.26, 40, 32);
  const torso = new THREE.Mesh(torsoGeo, red);
  torso.scale.set(1, 1.55, 1);
  torso.position.y = 0;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Subtle torso highlight rim (dark red band at the bottom for visual grounding)
  const rimGeo = new THREE.TorusGeometry(0.26, 0.018, 16, 48);
  const rim = new THREE.Mesh(rimGeo, darkRed);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.22;
  rim.castShadow = true;
  group.add(rim);

  // Visor frame — a flattened rounded box sitting proud of the torso front.
  // Oriented on +z in local frame (= MJ +y = "forward" in the default pose).
  const visorGroup = new THREE.Group();
  visorGroup.position.set(0, 0.08, 0.205);

  const frameGeo = new THREE.BoxGeometry(0.28, 0.14, 0.06);
  frameGeo.translate(0, 0, -0.015);
  // Round the corners a touch by scaling a sphere into a chamfer pass — skip
  // for perf, box is fine at this size. Use the frame material.
  const frame = new THREE.Mesh(frameGeo, visorFrame);
  frame.castShadow = true;
  visorGroup.add(frame);

  const glassGeo = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const glass = new THREE.Mesh(glassGeo, visorGlass);
  glass.scale.set(0.12, 0.055, 0.05);
  glass.rotation.x = -Math.PI / 2;
  glass.position.set(0, 0, 0.01);
  visorGroup.add(glass);

  // Highlight streak on visor — tiny white quad, slightly emissive.
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
    })
  );
  highlight.position.set(-0.06, 0.02, 0.035);
  highlight.rotation.z = -0.18;
  visorGroup.add(highlight);

  group.add(visorGroup);

  // Two short legs. Offset side-to-side, planted just under the torso.
  for (const sign of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.16, 0.14),
      darkRed
    );
    // Round the corners via a slight outer sphere blend — cheap: keep as box.
    leg.position.set(sign * 0.10, -0.29, -0.01);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
  }

  // Backpack — smaller rounded box on the back side.
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.20, 0.11),
    red
  );
  pack.position.set(0, 0.03, -0.21);
  pack.castShadow = true;
  pack.receiveShadow = true;
  group.add(pack);

  // Small antenna dot on pack (hint of detail)
  const antennaBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.04, 12),
    visorFrame
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
    })
  );
  antennaTip.position.set(0.05, 0.19, -0.21);
  group.add(antennaTip);

  return group;
}

// ──────────────────────────────────────────────────────────────────────────
// Project system — attach custom meshes, track labels, handle clicks.
// ──────────────────────────────────────────────────────────────────────────

export class ProjectSystem {
  constructor(app) {
    this.app = app;
    this.mounted = []; // { def, bodyID, meshGroup, labelEl }
    this.activeCard = null;
    this._worldPos = new THREE.Vector3();
    this._projScreen = new THREE.Vector3();

    this._installHost();
    this._installCardRoot();
    this._bindEvents();
  }

  _installHost() {
    // Container for floating labels (screen-space).
    const host = document.createElement("div");
    host.id = "project-labels";
    host.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 11;
    `;
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
    // Close card on Esc.
    addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.activeCard) this.dismissCard();
    });
    // Click outside to dismiss (but not on the card itself or on a label).
    addEventListener("mousedown", (e) => {
      if (!this.activeCard) return;
      if (e.target.closest("#project-card")) return;
      if (e.target.closest(".rex-project-label")) return;
      this.dismissCard();
    });
  }

  onSceneLoaded() {
    // Clear any existing mounts + labels.
    for (const m of this.mounted) {
      m.labelEl?.remove();
      if (m.meshGroup?.parent) m.meshGroup.parent.remove(m.meshGroup);
    }
    this.mounted = [];
    this.dismissCard();

    const { bodies } = this.app;
    if (!bodies) return;

    for (const def of PROJECTS) {
      // Find body id by name.
      let bodyID = -1;
      for (const [id, g] of Object.entries(bodies)) {
        if (g?.name === def.bodyName) { bodyID = Number(id); break; }
      }
      if (bodyID < 0) continue;
      const bodyGroup = bodies[bodyID];

      // Strip the auto-generated default meshes from the body group (keep the group).
      // The loader adds a THREE.Mesh child per geom; we swap those for our custom group.
      const toRemove = [];
      bodyGroup.traverse((o) => { if (o.isMesh) toRemove.push(o); });
      for (const o of toRemove) {
        if (o.parent) o.parent.remove(o);
        o.geometry?.dispose?.();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material?.dispose?.();
      }

      // Build + attach the procedural mesh. It inherits bodyGroup's physics-driven transform.
      const meshGroup = def.buildMesh();
      meshGroup.traverse((o) => {
        o.bodyID = bodyID; // allow grabber to raycast-pick this body
      });
      bodyGroup.add(meshGroup);

      // Rebuild the app's grabbable cache so clicks can hit the new meshes.
      this.app._rebuildGrabbables?.();

      // Floating label DOM
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
        this.showCard(def, bodyID);
      });
      this._host.appendChild(labelEl);

      this.mounted.push({ def, bodyID, meshGroup, labelEl });
    }
  }

  update() {
    if (!this.mounted.length) return;
    const { camera, renderer } = this.app;
    if (!camera || !renderer) return;
    const halfW = renderer.domElement.clientWidth / 2;
    const halfH = renderer.domElement.clientHeight / 2;

    for (const m of this.mounted) {
      const bodyGroup = this.app.bodies?.[m.bodyID];
      if (!bodyGroup) { m.labelEl.style.display = "none"; continue; }
      bodyGroup.updateWorldMatrix(true, false);
      this._worldPos.setFromMatrixPosition(bodyGroup.matrixWorld);
      // Position label slightly above the body so it sits over the head.
      this._projScreen.copy(this._worldPos);
      this._projScreen.y += 0.55;
      this._projScreen.project(camera);

      const behind = this._projScreen.z > 1;
      if (behind) { m.labelEl.style.display = "none"; continue; }

      const sx = halfW + this._projScreen.x * halfW;
      const sy = halfH - this._projScreen.y * halfH;

      m.labelEl.style.display = "";
      m.labelEl.style.transform = `translate(calc(${sx.toFixed(1)}px - 50%), calc(${sy.toFixed(1)}px - 50%))`;
    }
  }

  showCard(def, bodyID) {
    this.activeCard = { def, bodyID };
    const linksHTML = (def.links || [])
      .map((l) => `<a href="${l.href}" target="_blank" rel="noopener noreferrer">${l.label}</a>`)
      .join("");
    this._cardRoot.innerHTML = `
      <header class="rex-ui-card-head">
        <div class="rex-ui-card-index">01</div>
        <div class="rex-ui-card-titles">
          <div class="rex-ui-card-meta">${def.meta || ""}</div>
          <h2>${def.label}</h2>
          <div class="rex-ui-card-sub">${def.subtitle || ""}</div>
        </div>
        <button class="rex-ui-card-close" type="button" aria-label="Close">×</button>
      </header>
      <div class="rex-ui-card-body">
        <p>${def.description || ""}</p>
      </div>
      ${linksHTML ? `<footer class="rex-ui-card-links">${linksHTML}</footer>` : ""}
    `;
    this._cardRoot.style.setProperty("--accent", def.accent || "#d4a05a");
    this._cardRoot.style.display = "";
    requestAnimationFrame(() => this._cardRoot.classList.add("is-open"));
    this._cardRoot.querySelector(".rex-ui-card-close")?.addEventListener("click", () => this.dismissCard());
  }

  dismissCard() {
    if (!this.activeCard) return;
    this.activeCard = null;
    this._cardRoot.classList.remove("is-open");
    setTimeout(() => { this._cardRoot.style.display = "none"; }, 240);
  }
}
