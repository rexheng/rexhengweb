import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { loadSceneFromURL, getPosition, getQuaternion } from "./mujocoLoader.js";
import { Grabber } from "./grabber.js";
import { Trails } from "./trails.js";
import { ContactAudio } from "./audio.js";
import { Sparks } from "./sparks.js";
import { MetricsHud } from "./metricsHud.js";
import { Crosshair } from "./crosshair.js";
import { HoverHighlight } from "./hoverHighlight.js";
import { Replay } from "./replay.js";
import { PortfolioOverlay } from "./portfolioOverlay.js";
import load_mujoco from "../vendor/mujoco/mujoco_wasm.js";

const SCENE_FILE = "humanoid.xml";
const FRAMING = { camPos: [3.2, 1.8, 3.2], target: [0, 0.9, 0] };

const GRAVITY_PRESETS = { Earth: -9.81, Moon: -1.62, Space: 0.0 };
const TIMESCALE_PRESETS = { "0.25×": 0.25, "0.5×": 0.5, "1×": 1.0, "2×": 2.0 };

const WIND_DIRS = [
  { label: "N",  rad: Math.PI * 0.5 },
  { label: "NE", rad: Math.PI * 0.25 },
  { label: "E",  rad: 0 },
  { label: "SE", rad: -Math.PI * 0.25 },
  { label: "S",  rad: -Math.PI * 0.5 },
  { label: "SW", rad: -Math.PI * 0.75 },
  { label: "W",  rad: Math.PI },
  { label: "NW", rad: Math.PI * 0.75 },
];

// Neutral stand pose for humanoid — all joints at 0, arms relaxed at sides.
// Applied to qpos on load/reset so the humanoid starts upright and stable.
// qpos layout: [root_xyz(3), root_quat(4), spine(3), R-leg(6), L-leg(6), R-arm(3), L-arm(3)]
const HUMANOID_STAND_QPOS = [
  0, 0, 1.282,                    // root xyz — matches body pos in XML
  1, 0, 0, 0,                     // root quat (identity)
  0, 0, 0,                        // abdomen_z, abdomen_y, abdomen_x
  0, 0, 0, 0, 0, 0,               // R hip_x, hip_z, hip_y, knee, ankle_y, ankle_x
  0, 0, 0, 0, 0, 0,               // L hip_x, hip_z, hip_y, knee, ankle_y, ankle_x
  -0.6, 0.8, 0,                   // R shoulder1, shoulder2, elbow — arms down at sides
  -0.6, 0.8, 0,                   // L shoulder1, shoulder2, elbow
];

// Joint names for PD stand-hold (match XML actuators in order).
const ACT_NAMES = [
  "abdomen_z", "abdomen_y", "abdomen_x",
  "hip_x_right", "hip_z_right", "hip_y_right", "knee_right", "ankle_y_right", "ankle_x_right",
  "hip_x_left", "hip_z_left", "hip_y_left", "knee_left", "ankle_y_left", "ankle_x_left",
  "shoulder1_right", "shoulder2_right", "elbow_right",
  "shoulder1_left", "shoulder2_left", "elbow_left",
];
// PD targets matching the stand pose above.
const ACT_TARGETS = {
  abdomen_z: 0, abdomen_y: 0, abdomen_x: 0,
  hip_x_right: 0, hip_z_right: 0, hip_y_right: 0, knee_right: 0, ankle_y_right: 0, ankle_x_right: 0,
  hip_x_left: 0, hip_z_left: 0, hip_y_left: 0, knee_left: 0, ankle_y_left: 0, ankle_x_left: 0,
  shoulder1_right: -0.6, shoulder2_right: 0.8, elbow_right: 0,
  shoulder1_left: -0.6, shoulder2_left: 0.8, elbow_left: 0,
};
// PD gains per joint — tuned so the humanoid holds upright but remains responsive
// to grabbing. Ankle & leg gains high (balance), arm gains lower (feels ragdolly).
const PD_GAINS = {
  abdomen_z: [200, 20], abdomen_y: [200, 20], abdomen_x: [200, 20],
  hip_x_right: [200, 20], hip_z_right: [200, 20], hip_y_right: [300, 30],
  knee_right: [300, 30], ankle_y_right: [150, 15], ankle_x_right: [150, 15],
  hip_x_left: [200, 20], hip_z_left: [200, 20], hip_y_left: [300, 30],
  knee_left: [300, 30], ankle_y_left: [150, 15], ankle_x_left: [150, 15],
  shoulder1_right: [60, 6], shoulder2_right: [60, 6], elbow_right: [60, 6],
  shoulder1_left: [60, 6], shoulder2_left: [60, 6], elbow_left: [60, 6],
};

class App {
  constructor() {
    this.scene = null;
    this.model = null;
    this.data = null;
    this.bodies = {};
    this.mujocoRoot = null;
    this.mujoco = null;
    this.currentScene = SCENE_FILE;
    this.params = {
      paused: false,
      timescaleLabel: "1×",
      gravityLabel: "Earth",
      reset: () => this.resetSim(),
      perturb: () => this.randomPerturb(),
      trails: false,
      audio: true,    // default ON per spec
      sparks: false,
      standHold: true, // PD keeps humanoid upright until grabbed
      windEnabled: false,
      wind: 0.0,
      windDir: 0,
      orbit: false,
      orbitSpeed: 0.15,
    };
    this.clock = new THREE.Clock();
    this.mujocoTime = 0;
    this.camTween = null;
    this._lastFrameMs = 0;
    this._suspendPD = false; // temporarily disable stand-hold while grabber is active

    // PD index cache — filled on scene load.
    this._pdActIdx = {};
    this._pdQposAdr = {};
    this._pdDofAdr = {};
    this._pdGear = {};
    this._torsoId = -1;
  }

  frameCamera() {
    this.camTween = {
      t0: performance.now(),
      dur: 900,
      fromPos: this.camera.position.clone(),
      toPos: new THREE.Vector3(...FRAMING.camPos),
      fromTarget: this.controls.target.clone(),
      toTarget: new THREE.Vector3(...FRAMING.target),
    };
  }

  updateCamTween() {
    if (!this.camTween) return;
    const k = Math.min(1, (performance.now() - this.camTween.t0) / this.camTween.dur);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    this.camera.position.lerpVectors(this.camTween.fromPos, this.camTween.toPos, e);
    this.controls.target.lerpVectors(this.camTween.fromTarget, this.camTween.toTarget, e);
    if (k >= 1) this.camTween = null;
  }

  // Cinematic orbit — rotates camera around the humanoid torso's world position.
  // Uses low-pass smoothing on the tracked position so torso jitter doesn't wobble
  // the camera target. Also updates controls.target so OrbitControls stays consistent.
  updateCinematicOrbit(dtSec) {
    if (!this.params.orbit || this.camTween) return;
    if (!this.data || this._torsoId < 0) return;

    // Fetch torso world position in THREE frame (y-up).
    const torsoGroup = this.bodies?.[this._torsoId];
    if (!torsoGroup) return;
    torsoGroup.updateWorldMatrix(true, false);
    const torsoWorld = new THREE.Vector3();
    torsoWorld.setFromMatrixPosition(torsoGroup.matrixWorld);

    // Exponential smooth the orbit center so physics jitter doesn't shake the camera.
    if (!this._orbitCenter) this._orbitCenter = torsoWorld.clone();
    const alpha = 0.12;
    this._orbitCenter.lerp(torsoWorld, alpha);
    this.controls.target.copy(this._orbitCenter);

    const t = this.controls.target;
    const p = this.camera.position;
    const dx = p.x - t.x;
    const dz = p.z - t.z;
    const r = Math.hypot(dx, dz);
    if (r < 1e-4) return;
    const theta = Math.atan2(dz, dx) + this.params.orbitSpeed * dtSec;
    p.x = t.x + r * Math.cos(theta);
    p.z = t.z + r * Math.sin(theta);
  }

  async init() {
    this.mujoco = await load_mujoco();
    this.mujoco.FS.mkdir("/working");
    this.mujoco.FS.mount(this.mujoco.MEMFS, { root: "." }, "/working");
    const txt = await (await fetch("./assets/scenes/" + SCENE_FILE)).text();
    this.mujoco.FS.writeFile("/working/" + SCENE_FILE, txt);

    // Three.js scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121a2a);
    this.scene.fog = new THREE.FogExp2(0x0e1524, 0.008);

    const skyGeo = new THREE.SphereGeometry(120, 48, 24);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x0a1326) },
        midColor: { value: new THREE.Color(0x2a3a5c) },
        bottomColor: { value: new THREE.Color(0x6a5a4a) },
        offset: { value: 4 },
      },
      vertexShader: `varying vec3 vWorldPos;
        void main() { vec4 wp = modelMatrix * vec4(position,1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 midColor; uniform vec3 bottomColor; uniform float offset;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos + vec3(0., offset, 0.)).y;
          vec3 col = h > 0.0
            ? mix(midColor, topColor, pow(h, 0.55))
            : mix(midColor, bottomColor, pow(-h, 0.7));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
    this.camera.position.set(3.4, 2.2, 3.4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    document.body.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envMap;
    this.scene.environmentIntensity = 0.35;
    pmrem.dispose();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.9, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 30;
    this.controls.mouseButtons = { LEFT: null, MIDDLE: null, RIGHT: THREE.MOUSE.ROTATE };

    // Lighting
    const key = new THREE.DirectionalLight(0xfff1d8, 1.3);
    key.position.set(4, 8, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x88aaff, 0.5);
    fill.position.set(-5, 4, -3);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xff8866, 0.6);
    rim.position.set(-2, 3, 6);
    this.scene.add(rim);

    this.scene.add(new THREE.HemisphereLight(0x6688aa, 0x1a1a2a, 0.25));

    // Post-processing
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * 0.5, innerHeight * 0.5), 0.28, 0.65, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.stats = new Stats();
    this.stats.dom.style.cssText = "position:fixed;top:8px;left:8px;";
    document.body.appendChild(this.stats.dom);

    this._buildGui();

    // HUD
    const hud = document.createElement("div");
    hud.id = "hud";
    hud.innerHTML = `<h1>Rex Heng</h1><p id="hud-hints"></p>`;
    document.body.appendChild(hud);
    this._hintsEl = hud.querySelector("#hud-hints");
    this._currentHintKey = "";
    this._HINT_PRESETS = {
      idle:    `Left-drag grab · Middle-click punt · R replay`,
      hover:   `Left-drag to grab · Middle-click punt · R replay`,
      grab:    `Wheel: push/pull · E/Q: rotate · Right-click: freeze · Release to let go`,
      frozen:  `Body frozen mid-air · Release mouse to keep floating · Right-click to unfreeze`,
      replay:  `◉ Slo-mo replay — press R again to return to live`,
    };
    this._updateHints();

    addEventListener("resize", () => this.onResize());

    await this.switchScene(this.currentScene);
    this.grabber = new Grabber(this);
    this.trails = new Trails(this);
    this.trails.setEnabled(this.params.trails);
    this.audio = new ContactAudio(this);
    this.audio.setEnabled(this.params.audio);
    this.sparks = new Sparks(this);
    this.sparks.setEnabled(this.params.sparks);
    this.metricsHud = new MetricsHud(this);
    this.crosshair = new Crosshair(this);
    this.hoverHighlight = new HoverHighlight(this);
    this.replay = new Replay(this);
    this._installPauseChip();
    this._installWindCompass();

    // Portfolio overlay — collapsible, left-anchored.
    this.portfolio = new PortfolioOverlay({
      name: "Rex Heng",
      tagline: "PPE at LSE · building at the intersection of finance, policy, and code.",
      initials: "RH",
      links: [
        { label: "Email", href: "mailto:rexheng@gmail.com" },
        { label: "LinkedIn", href: "https://www.linkedin.com/in/rexheng/" },
        { label: "GitHub", href: "https://github.com/rexheng" },
      ],
    });

    this.animate();
  }

  _buildGui() {
    const gui = new GUI({ title: "Controls", width: 280 });

    // Scene
    const fScene = gui.addFolder("Scene");
    fScene.add(this.params, "reset").name("Reset");
    fScene.add(this.params, "perturb").name("Random perturb");

    // Physics
    const fPhys = gui.addFolder("Physics");
    fPhys.add(this.params, "paused");
    fPhys.add(this.params, "timescaleLabel", Object.keys(TIMESCALE_PRESETS)).name("Timescale");
    fPhys.add(this.params, "gravityLabel", Object.keys(GRAVITY_PRESETS))
      .name("Gravity")
      .onChange((v) => { if (this.model) this.model.opt.gravity[2] = GRAVITY_PRESETS[v]; });
    fPhys.add(this.params, "standHold").name("Hold stand pose");
    fPhys.add(this.params, "windEnabled").name("Wind");
    fPhys.add(this.params, "wind", 0, 40, 0.1).name("Wind force (N)");
    this._installWindCompassButtons(fPhys);

    // Camera
    const fCam = gui.addFolder("Camera");
    fCam.add(this.params, "orbit").name("Cinematic orbit");
    fCam.add(this.params, "orbitSpeed", 0.02, 0.6, 0.01).name("Orbit speed");

    // Effects
    const fFx = gui.addFolder("Effects");
    fFx.add(this.params, "trails").name("Trajectory trails").onChange((v) => this.trails?.setEnabled(v));
    fFx.add(this.params, "audio").name("Contact audio").onChange((v) => this.audio?.setEnabled(v));
    fFx.add(this.params, "sparks").name("Impact sparks").onChange((v) => this.sparks?.setEnabled(v));

    fPhys.open();
    fFx.open();
  }

  // Add a custom 8-direction compass picker into a lil-gui folder.
  // Built as 8 buttons in a 3x3 grid (center empty). Clicking sets windDir
  // to the corresponding angle and highlights the active button.
  _installWindCompassButtons(folder) {
    const host = document.createElement("div");
    host.style.cssText = `
      padding: 6px 8px 8px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 24px);
      gap: 3px;
      font: 10px ui-monospace, Menlo, monospace;
      letter-spacing: 0.05em;
    `;
    const order = ["NW", "N", "NE", "W", "", "E", "SW", "S", "SE"];
    this._windBtns = {};
    for (const label of order) {
      const b = document.createElement("button");
      b.type = "button";
      if (label) {
        b.textContent = label;
        b.style.cssText = `
          background: rgba(42,53,96,0.6);
          color: #cfd6e8;
          border: 1px solid rgba(140,165,220,0.25);
          border-radius: 4px;
          cursor: pointer;
          font: inherit;
          padding: 0;
        `;
        b.addEventListener("click", () => this._setWindDir(label));
        b.addEventListener("mouseenter", () => { b.style.background = "rgba(60,80,140,0.75)"; });
        b.addEventListener("mouseleave", () => this._refreshWindBtns());
        this._windBtns[label] = b;
      } else {
        b.style.visibility = "hidden";
      }
      host.appendChild(b);
    }
    // Append after the folder's children container.
    const children = folder.$children || folder.domElement.querySelector(".children");
    if (children) children.appendChild(host);
    else folder.domElement.appendChild(host);
    this._refreshWindBtns();
  }

  _setWindDir(label) {
    const entry = WIND_DIRS.find((d) => d.label === label);
    if (!entry) return;
    this.params.windDir = entry.rad;
    this._refreshWindBtns();
  }

  _refreshWindBtns() {
    if (!this._windBtns) return;
    // Find the closest cardinal to current windDir (wrapped to [-π, π]).
    let dir = this.params.windDir;
    while (dir > Math.PI) dir -= 2 * Math.PI;
    while (dir < -Math.PI) dir += 2 * Math.PI;
    let best = "E", bestErr = Infinity;
    for (const { label, rad } of WIND_DIRS) {
      const err = Math.abs(((dir - rad + Math.PI * 3) % (2 * Math.PI)) - Math.PI);
      if (err < bestErr) { bestErr = err; best = label; }
    }
    for (const [lab, btn] of Object.entries(this._windBtns)) {
      const active = lab === best;
      btn.style.background = active ? "rgba(120,160,230,0.8)" : "rgba(42,53,96,0.6)";
      btn.style.color = active ? "#0d1220" : "#cfd6e8";
      btn.style.fontWeight = active ? "600" : "400";
    }
  }

  async switchScene(name) {
    if (this.mujocoRoot) {
      this.scene.remove(this.mujocoRoot);
      this.mujocoRoot.traverse((o) => {
        if (o.geometry) o.geometry.dispose?.();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose?.());
      });
    }
    this.currentScene = name;
    const [model, data, bodies] = await loadSceneFromURL(this.mujoco, name, this);
    this.model = model;
    this.data = data;
    this.bodies = bodies;
    this.mujocoTime = 0;
    this._rebuildGrabbables();
    this._indexHumanoid();
    this._applyStandPose();
    this._orbitCenter = null;
    this.frameCamera();
    this.trails?.onSceneSwitch();
    this.replay?.onSceneSwitch();
  }

  // Build name-keyed lookup tables for PD control + find torso body id.
  _indexHumanoid() {
    if (!this.model) return;
    this._pdActIdx = {};
    this._pdQposAdr = {};
    this._pdDofAdr = {};
    this._pdGear = {};
    this._torsoId = -1;
    const dec = new TextDecoder();
    const names = dec.decode(this.model.names);
    const read = (adr) => names.slice(adr).split("\0")[0];
    for (let i = 0; i < this.model.nu; i++) {
      const n = read(this.model.name_actuatoradr[i]);
      this._pdActIdx[n] = i;
      this._pdGear[n] = this.model.actuator_gear[i * 6] || 1;
    }
    for (let j = 0; j < this.model.njnt; j++) {
      const n = read(this.model.name_jntadr[j]);
      this._pdQposAdr[n] = this.model.jnt_qposadr[j];
      this._pdDofAdr[n] = this.model.jnt_dofadr[j];
    }
    for (let b = 0; b < this.model.nbody; b++) {
      if (read(this.model.name_bodyadr[b]) === "torso") this._torsoId = b;
    }
  }

  // Write the neutral stand qpos to data.qpos, zero qvel + residual forces,
  // then mj_forward so mesh transforms refresh before the next render.
  _applyStandPose() {
    if (!this.data || !this.model) return;
    const nq = this.model.nq;
    for (let i = 0; i < Math.min(nq, HUMANOID_STAND_QPOS.length); i++) {
      this.data.qpos[i] = HUMANOID_STAND_QPOS[i];
    }
    for (let i = 0; i < this.model.nv; i++) this.data.qvel[i] = 0;
    if (this.data.xfrc_applied) {
      for (let i = 0; i < this.data.xfrc_applied.length; i++) this.data.xfrc_applied[i] = 0;
    }
    if (this.data.ctrl) {
      for (let i = 0; i < this.data.ctrl.length; i++) this.data.ctrl[i] = 0;
    }
    this.mujoco.mj_forward(this.model, this.data);
  }

  resetSim() {
    if (!this.model) return;
    this.mujoco.mj_resetData(this.model, this.data);
    this._applyStandPose();
  }

  _rebuildGrabbables() {
    this._grabbables = [];
    if (!this.mujocoRoot) return;
    this.mujocoRoot.traverse((o) => {
      if (o.isMesh && o.bodyID !== undefined && o.bodyID > 0) this._grabbables.push(o);
    });
  }

  getGrabbables() {
    return this._grabbables || [];
  }

  randomPerturb() {
    if (!this.data || !this.model) return;
    const n = this.model.nv;
    for (let i = 0; i < n; i++) this.data.qfrc_applied[i] = (Math.random() - 0.5) * 400;
    setTimeout(() => { for (let i = 0; i < n; i++) this.data.qfrc_applied[i] = 0; }, 80);
  }

  // PD stand-hold — writes data.ctrl to track ACT_TARGETS on every listed actuator.
  // Runs only when standHold toggle is on AND grabber isn't actively manipulating the humanoid.
  applyStandHold() {
    if (!this.params.standHold || !this.data || !this.model) return;
    if (this.grabber?.active) {
      // While grabbing, zero ctrl so the body goes ragdoll for the user.
      if (!this._ctrlZeroed) {
        for (const name of ACT_NAMES) {
          const ai = this._pdActIdx[name];
          if (ai != null) this.data.ctrl[ai] = 0;
        }
        this._ctrlZeroed = true;
      }
      return;
    }
    this._ctrlZeroed = false;
    for (const name of ACT_NAMES) {
      const ai = this._pdActIdx[name];
      if (ai == null) continue;
      const qposAdr = this._pdQposAdr[name];
      const dofAdr = this._pdDofAdr[name];
      const gear = this._pdGear[name];
      const target = ACT_TARGETS[name] ?? 0;
      const [Kp, Kd] = PD_GAINS[name] ?? [100, 10];
      const q = this.data.qpos[qposAdr];
      const qd = this.data.qvel[dofAdr];
      const tau = Kp * (target - q) - Kd * qd;
      const ctrl = tau / gear;
      this.data.ctrl[ai] = ctrl < -1 ? -1 : ctrl > 1 ? 1 : ctrl;
    }
  }

  applyWind() {
    if (!this.data || !this.model) return;
    const active = this.params.windEnabled && this.params.wind > 0;
    const w = active ? this.params.wind : 0;
    const fx = active ? w * Math.cos(this.params.windDir) : 0;
    const fy = active ? w * Math.sin(this.params.windDir) : 0;
    const xfrc = this.data.xfrc_applied;
    for (let b = 1; b < this.model.nbody; b++) {
      const off = b * 6;
      xfrc[off + 0] = fx;
      xfrc[off + 1] = fy;
      xfrc[off + 2] = 0;
      xfrc[off + 3] = 0;
      xfrc[off + 4] = 0;
      xfrc[off + 5] = 0;
    }
  }

  stepPhysics() {
    if (this.params.paused || !this.model) return;
    const timestep = this.model.opt.timestep;
    const scale = TIMESCALE_PRESETS[this.params.timescaleLabel] ?? 1.0;
    const wallDt = this.clock.getDelta() * 1000 * scale;
    if (this.mujocoTime === 0) this.mujocoTime = performance.now() - wallDt;
    this.mujocoTime += wallDt;
    const simStart = performance.now();
    while (this.mujocoTime < performance.now()) {
      this.mujoco.mj_step(this.model, this.data);
      this.mujocoTime += timestep * 1000;
      if (performance.now() - simStart > 30) break;
    }
  }

  syncMeshes() {
    if (!this.model || !this.data) return;
    for (let b = 1; b < this.model.nbody; b++) {
      const group = this.bodies[b];
      if (!group) continue;
      getPosition(this.data.xpos, b, group.position);
      getQuaternion(this.data.xquat, b, group.quaternion);
    }
  }

  onResize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
    this.bloom?.setSize(innerWidth * 0.5, innerHeight * 0.5);
  }

  _installPauseChip() {
    const chip = document.createElement("div");
    chip.id = "pause-chip";
    chip.textContent = "⏸ PAUSED";
    chip.style.cssText = `
      position:fixed; right:12px; bottom:12px; z-index:20;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size:11px; letter-spacing:0.14em;
      color:#ffe0a0; background:rgba(60,36,18,0.85);
      padding:6px 12px; border-radius:999px;
      border:1px solid rgba(255,180,80,0.45);
      box-shadow: 0 0 12px rgba(255,180,80,0.25);
      pointer-events:none; user-select:none;
      display:none;
      animation: pauseChipPulse 1.6s ease-in-out infinite;
    `;
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pauseChipPulse {
        0%,100% { opacity: 0.75; }
        50%     { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(chip);
    this._pauseChip = chip;
  }

  _updateHints() {
    if (!this._hintsEl) return;
    const g = this.grabber;
    let key = "idle";
    if (this.replay?.active) key = "replay";
    else if (g?.active) key = g.frozen ? "frozen" : "grab";
    else if ((this.crosshair?.hoveredBodyID ?? -1) > 0) key = "hover";
    if (key === this._currentHintKey) return;
    this._currentHintKey = key;
    this._hintsEl.textContent = this._HINT_PRESETS[key];
  }

  _installWindCompass() {
    const size = 54;
    const wrap = document.createElement("div");
    wrap.id = "wind-compass";
    wrap.style.cssText = `
      position:fixed; left:12px; bottom:52px; z-index:9;
      width:${size}px; height:${size}px;
      pointer-events:none; user-select:none;
      opacity:0; transition: opacity 180ms ease;
    `;
    wrap.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="-27 -27 54 54" xmlns="http://www.w3.org/2000/svg">
        <circle cx="0" cy="0" r="22" fill="rgba(14,20,32,0.72)" stroke="rgba(120,180,255,0.22)" stroke-width="1"/>
        <text x="0" y="-14" fill="#7ee8fa" font-size="7" font-family="ui-monospace,Menlo,monospace" text-anchor="middle" opacity="0.7">N</text>
        <g id="wind-arrow">
          <path d="M -13 0 L 13 0 M 7 -5 L 13 0 L 7 5" stroke="#ffc04d" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <text id="wind-mag" x="0" y="25" fill="#ffc04d" font-size="7" font-family="ui-monospace,Menlo,monospace" text-anchor="middle">0 N</text>
      </svg>
    `;
    document.body.appendChild(wrap);
    this._windCompass = wrap;
    this._windArrow = wrap.querySelector("#wind-arrow");
    this._windMag = wrap.querySelector("#wind-mag");
    this._lastWindRender = { w: -1, dir: NaN };
  }

  _updateWindCompass() {
    if (!this._windCompass) return;
    const effectiveW = this.params.windEnabled ? this.params.wind : 0;
    const w = effectiveW;
    const dir = this.params.windDir;
    const cached = this._lastWindRender;
    if (Math.abs(w - cached.w) < 0.01 && Math.abs(dir - cached.dir) < 0.005) return;
    cached.w = w; cached.dir = dir;

    const alpha = Math.min(1, w / 6);
    this._windCompass.style.opacity = alpha.toFixed(3);
    const deg = -dir * (180 / Math.PI);
    this._windArrow.setAttribute("transform", `rotate(${deg.toFixed(1)})`);
    this._windMag.textContent = `${w.toFixed(1)} N`;
    this._refreshWindBtns();
  }

  _updatePauseChip() {
    if (!this._pauseChip) return;
    const shouldShow = !!this.params.paused;
    const isShown = this._pauseChip.style.display !== "none";
    if (shouldShow !== isShown) {
      this._pauseChip.style.display = shouldShow ? "" : "none";
    }
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    const now = performance.now();
    const frameDt = this._lastFrameMs ? (now - this._lastFrameMs) / 1000 : 0;
    this._lastFrameMs = now;
    this.updateCamTween();
    this.updateCinematicOrbit(Math.min(frameDt, 0.05));
    this.controls.update();
    this.applyWind();
    this.grabber?.apply();
    this.applyStandHold();
    this.stepPhysics();
    this.replay?.update();
    this.syncMeshes();
    this.trails?.update();
    this.audio?.update();
    this.sparks?.update();
    this.metricsHud?.update();
    this.crosshair?.update();
    this.hoverHighlight?.update();
    this._updateHints();
    this._updateWindCompass();
    this._updatePauseChip();
    this.composer.render();
    this.stats.update();
  };
}

const app = new App();
window.__app = app;
app.init().catch((e) => {
  console.error(e);
  const el = document.createElement("pre");
  el.style.cssText = "color:#f88;padding:20px;font-family:monospace;white-space:pre-wrap;";
  el.textContent = "Boot error:\n" + (e && e.stack || e);
  document.body.appendChild(el);
});
