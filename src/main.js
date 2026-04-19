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
import { ContactViz } from "./contacts.js";
import { ContactAudio } from "./audio.js";
import { Sparks } from "./sparks.js";
import { MetricsHud } from "./metricsHud.js";
import { Crosshair } from "./crosshair.js";
import { HoverHighlight } from "./hoverHighlight.js";
import { Replay } from "./replay.js";
import { HumanoidController, GetUpFSM } from "./humanoidController.js";
import load_mujoco from "../vendor/mujoco/mujoco_wasm.js";

const SCENE_FILES = [
  "humanoid.xml",
  "humanoid_getup.xml",
];

// Per-scene camera framing — [camPos, lookTarget]
const SCENE_FRAMING = {
  "humanoid.xml": [[3.2, 1.8, 3.2], [0, 0.6, 0]],
  "humanoid_getup.xml": [[3.2, 1.8, 3.2], [0, 0.6, 0]],
};

class App {
  constructor() {
    this.scene = null;
    this.model = null;
    this.data = null;
    this.bodies = {};
    this.mujocoRoot = null;
    this.mujoco = null;
    this.currentScene = "humanoid.xml";
    this.params = {
      scene: this.currentScene,
      paused: false,
      timescale: 1.0,
      gravityZ: -9.81,
      reset: () => this.resetSim(),
      perturb: () => this.randomPerturb(),
      trails: false,
      contacts: false,
      audio: false,
      sparks: false,
      screenShake: false,
      autoReplay: false,   // auto-trigger slo-mo replay on big contact spikes
      autoGetUp: true,     // auto-engage get-up FSM when humanoid is settled on the ground
      windEnabled: false,  // master toggle — when false, wind sliders are ignored
      wind: 0.0,           // magnitude, N (applied to every freejoint body)
      windDir: 0,          // heading in radians (0 = +x in MJ)
      orbit: false,
      orbitSpeed: 0.15, // radians/second
      bulletTime: false, // target state; actual blend lives in this.bulletBlend
      toggleBulletTime: () => this.setBulletTime(!this.params.bulletTime),
      fireCannon: () => this.fireCannon(),
      spawn: () => this.spawnNext(),
      freezeAll: () => this.freezeAll(),
      launch: () => this.launchProjectile(),
      launchAngle: 38,   // degrees above horizontal
      launchSpeed: 9.0,  // m/s initial speed
      holdQuadruped: () => this.humanoidCtrl?.seedToQuadruped(),
      releaseHumanoidPD: () => this.humanoidCtrl?.setEnabled(false),
      engageGetUpSupine: () => {
        const fire = () => {
          this.humanoidCtrl?.seedToSupine();
          this.getUpFSM?.start("supine");
        };
        if (this.currentScene !== "humanoid_getup.xml") {
          this.params.scene = "humanoid_getup.xml";
          this.switchScene("humanoid_getup.xml").then(fire);
        } else fire();
      },
      engageGetUpProne: () => {
        const fire = () => {
          this.humanoidCtrl?.seedToProne();
          this.getUpFSM?.start("prone");
        };
        if (this.currentScene !== "humanoid_getup.xml") {
          this.params.scene = "humanoid_getup.xml";
          this.switchScene("humanoid_getup.xml").then(fire);
        } else fire();
      },
    };
    this.clock = new THREE.Clock();
    this.mujocoTime = 0;
    this.camTween = null; // { t0, dur, fromPos, toPos, fromTarget, toTarget }
    this.bulletBlend = 0; // 0 = normal, 1 = full bullet time
    this.shakeEnergy = 0; // decays each frame; bumped on contact spikes
    this._shakeOffset = new THREE.Vector3();
    this._prevShakeSpikes = new Map(); // geom-pair → depth (for edge-triggering)
  }

  setBulletTime(on) {
    this.params.bulletTime = on;
    // flash-tint the HUD when going into bullet time
    document.body.classList.toggle("bullet-time", on);
  }

  frameCamera(scene) {
    const [p, t] = SCENE_FRAMING[scene] || [[3.4, 2.2, 3.4], [0, 0.9, 0]];
    this.camTween = {
      t0: performance.now(),
      dur: 900,
      fromPos: this.camera.position.clone(),
      toPos: new THREE.Vector3(...p),
      fromTarget: this.controls.target.clone(),
      toTarget: new THREE.Vector3(...t),
    };
  }

  updateCamTween() {
    if (!this.camTween) return;
    const k = Math.min(1, (performance.now() - this.camTween.t0) / this.camTween.dur);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
    this.camera.position.lerpVectors(this.camTween.fromPos, this.camTween.toPos, e);
    this.controls.target.lerpVectors(this.camTween.fromTarget, this.camTween.toTarget, e);
    if (k >= 1) this.camTween = null;
  }

  // Rotates camera.position around controls.target on the world-Y axis.
  // Runs only when params.orbit is on AND no scene-switch tween is currently playing
  // (so we don't fight the tween for control of the camera).
  updateCinematicOrbit(dtSec) {
    if (!this.params.orbit || this.camTween) return;
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
    // --- MuJoCo boot ---
    this.mujoco = await load_mujoco();
    this.mujoco.FS.mkdir("/working");
    this.mujoco.FS.mount(this.mujoco.MEMFS, { root: "." }, "/working");
    for (const f of SCENE_FILES) {
      if (f.startsWith("__")) continue; // generated at runtime
      const txt = await (await fetch("./assets/scenes/" + f)).text();
      this.mujoco.FS.writeFile("/working/" + f, txt);
    }
    this._spawnCursor = 0;

    // --- Three.js scene setup ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121a2a);
    this.scene.fog = new THREE.FogExp2(0x0e1524, 0.008);

    // Sky dome — vertical gradient (deep navy zenith → warm slate horizon)
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

    // PMREM procedural environment for PBR reflections (env only, not background)
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
    // Remap so left mouse is free for body grab; right = rotate, middle = dolly, shift+right = pan.
    // Middle button reserved for gravity-gun punt (grabber.js). Right = orbit.
    // Scroll wheel still dollies. Left = grabber / tool gun dispatch.
    this.controls.mouseButtons = { LEFT: null, MIDDLE: null, RIGHT: THREE.MOUSE.ROTATE };

    // Lighting — key + fill + rim
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

    // Post-processing — stronger bloom threshold tuned lower so lit surfaces glow
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // Half-res bloom: UnrealBloom builds a 5-level mip chain, each pass fullscreen.
    // Running the input buffer at 0.5× halves the pixel work with no visible quality loss.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * 0.5, innerHeight * 0.5), 0.28, 0.65, 0.92);
    this._bloomBase = 0.28; // remembered so bullet-time can ramp against it
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    // Stats + GUI
    this.stats = new Stats();
    this.stats.dom.style.cssText = "position:fixed;top:8px;left:8px;";
    document.body.appendChild(this.stats.dom);

    const gui = new GUI({ title: "MuJoCo Playground", width: 280 });
    gui.add(this.params, "scene", SCENE_FILES).onChange((v) => this.switchScene(v));
    gui.add(this.params, "paused");
    gui.add(this.params, "timescale", 0.0, 3.0, 0.01);
    gui.add(this.params, "gravityZ", -20, 0, 0.01).onChange((v) => { if (this.model) this.model.opt.gravity[2] = v; });
    gui.add(this.params, "reset");
    gui.add(this.params, "perturb").name("Random perturb");
    gui.add(this.params, "trails").name("Trajectory trails").onChange((v) => this.trails?.setEnabled(v));
    gui.add(this.params, "contacts").name("Contact vectors").onChange((v) => this.contactViz?.setEnabled(v));
    gui.add(this.params, "audio").name("Contact audio").onChange((v) => this.audio?.setEnabled(v));
    gui.add(this.params, "sparks").name("Impact sparks").onChange((v) => this.sparks?.setEnabled(v));
    gui.add(this.params, "screenShake").name("Screen shake");
    gui.add(this.params, "autoReplay").name("Auto slo-mo").onChange((v) => this.replay?.setAutoEnabled(v));
    gui.add(this.params, "autoGetUp").name("Auto get-up");
    gui.add(this.params, "windEnabled").name("Wind");
    gui.add(this.params, "wind", 0, 40, 0.1).name("Wind force (N)");
    gui.add(this.params, "windDir", -Math.PI, Math.PI, 0.01).name("Wind heading");
    gui.add(this.params, "orbit").name("Cinematic orbit");
    gui.add(this.params, "orbitSpeed", 0.02, 0.6, 0.01).name("Orbit speed");
    gui.add(this.params, "toggleBulletTime").name("⏱ Bullet time (Space)");
    gui.add(this.params, "fireCannon").name("🎯 Fire cannonball");
    gui.add(this.params, "spawn").name("➕ Spawn body (sandbox)");
    gui.add(this.params, "freezeAll").name("❄ Freeze all bodies");
    gui.add(this.params, "launch").name("🏹 Launch (catapult)");
    gui.add(this.params, "launchAngle", 5, 75, 1).name("Launch angle (°)").onChange(() => this._updateTrajectoryPreview());
    gui.add(this.params, "launchSpeed", 2, 15, 0.1).name("Launch speed (m/s)").onChange(() => this._updateTrajectoryPreview());
    gui.add(this.params, "holdQuadruped").name("🐾 Hold quadruped");
    gui.add(this.params, "engageGetUpSupine").name("🤸 Get up from supine");
    gui.add(this.params, "engageGetUpProne").name("🧎 Get up from prone");
    gui.add(this.params, "releaseHumanoidPD").name("Release PD");

    // Spacebar = bullet time; B = spawn body at crosshair aim; F = punch crosshair target.
    // Skip when typing in an input field.
    addEventListener("keydown", (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.code === "Space") {
        e.preventDefault();
        this.setBulletTime(!this.params.bulletTime);
      } else if (e.code === "KeyB") {
        e.preventDefault();
        this.spawnAtAim();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        this.punchAtAim();
      }
    });

    // HUD overlay — context-aware hints. The <p> updates based on grabber state so
    // the user sees exactly the bindings that matter right now.
    const hud = document.createElement("div");
    hud.id = "hud";
    hud.innerHTML = `<h1>MuJoCo × Three.js</h1><p id="hud-hints"></p>`;
    document.body.appendChild(hud);
    this._hintsEl = hud.querySelector("#hud-hints");
    this._currentHintKey = "";
    this._HINT_PRESETS = {
      idle:    `Left-drag grab · Middle-click punt · F punch · R replay · Space bullet time · B spawn`,
      hover:   `Left-drag to grab · Middle-click punt · F punch this body · R replay · B aim-spawn`,
      grab:    `Wheel: push/pull · E/Q: rotate · Right-click: freeze in place · Release to let go`,
      frozen:  `Body frozen mid-air · Release mouse to keep it floating · Right-click to unfreeze`,
      replay:  `◉ Slo-mo replay — press R again to return to live`,
    };
    this._updateHints(); // initial paint

    addEventListener("resize", () => this.onResize());

    await this.switchScene(this.currentScene);
    this.grabber = new Grabber(this);
    this.trails = new Trails(this);
    this.trails.setEnabled(this.params.trails);
    this.contactViz = new ContactViz(this);
    this.contactViz.setEnabled(this.params.contacts);
    this.audio = new ContactAudio(this);
    this.audio.setEnabled(this.params.audio);
    this.sparks = new Sparks(this);
    this.sparks.setEnabled(this.params.sparks);
    this.metricsHud = new MetricsHud(this);
    this.crosshair = new Crosshair(this);
    this.hoverHighlight = new HoverHighlight(this);
    this.replay = new Replay(this);
    this.humanoidCtrl = new HumanoidController(this);
    this.getUpFSM = new GetUpFSM(this.humanoidCtrl);
    this._installPauseChip();
    this._installWindCompass();
    this.animate();
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
    this.frameCamera(name);
    this.trails?.onSceneSwitch();
    this.replay?.onSceneSwitch();
    this.humanoidCtrl?.onSceneSwitch();
    this._updateTrajectoryPreview();
  }

  resetSim() {
    if (!this.model) return;
    this.mujoco.mj_resetData(this.model, this.data);
    this.mujoco.mj_forward(this.model, this.data);
  }

  // Cached list of grabbable meshes (bodyID > 0). Rebuilt on scene switch.
  // Avoids per-frame scene.traverse() from crosshair + grabber raycasts.
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

  // Teleports the next dormant spawn_N body in the sandbox scene to just in front of
  // the camera at a drop height. Uses direct qpos write on its freejoint.
  spawnNext() {
    if (this.currentScene !== "__sandbox.xml") {
      console.info("Spawn only works in sandbox scene — switching.");
      this.params.scene = "__sandbox.xml";
      this.switchScene("__sandbox.xml");
      return;
    }
    if (!this.data || !this.model) return;
    const name = `spawn_${this._spawnCursor % 24}`;
    this._spawnCursor++;
    // find body by name
    let ballID = -1;
    for (const [id, g] of Object.entries(this.bodies)) {
      if (g?.name === name) { ballID = Number(id); break; }
    }
    if (ballID < 0) { console.warn("no body", name); return; }

    // Drop position: camera forward projected onto the ground + height
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    // Project forward onto xz-plane (ignore y so it hits the floor area, not the sky)
    fwd.y = 0; fwd.normalize();
    const dropTHREE = new THREE.Vector3().copy(this.controls.target).addScaledVector(fwd, 0.8);
    dropTHREE.y = 2.2; // drop height in THREE world

    // THREE -> MJ: (x, y, z)_three -> (x, -z, y)_mj
    const mjX = dropTHREE.x;
    const mjY = -dropTHREE.z;
    const mjZ = dropTHREE.y;

    const jntadr = this.model.body_jntadr[ballID];
    const qposadr = this.model.jnt_qposadr[jntadr];
    const dofadr = this.model.jnt_dofadr[jntadr];

    // freejoint: qpos layout [x y z qw qx qy qz]
    this.data.qpos[qposadr + 0] = mjX;
    this.data.qpos[qposadr + 1] = mjY;
    this.data.qpos[qposadr + 2] = mjZ;
    this.data.qpos[qposadr + 3] = 1; // identity quat
    this.data.qpos[qposadr + 4] = 0;
    this.data.qpos[qposadr + 5] = 0;
    this.data.qpos[qposadr + 6] = 0;
    // zero velocity so it starts from rest (gravity pulls it down)
    for (let k = 0; k < 6; k++) this.data.qvel[dofadr + k] = 0;
    this.mujoco.mj_forward(this.model, this.data);
  }

  // Crosshair-aimed spawn: fires a ray from the crosshair's current NDC, finds the
  // world-space aim point (hovered body if any, else intersection with the ground
  // plane y=0), and teleports the next dormant sandbox body to just above it.
  // Reuses spawnNext's body-cycling + drop logic — only the landing XY differs.
  spawnAtAim() {
    if (this.currentScene !== "__sandbox.xml") {
      console.info("Aim-spawn only in sandbox — switching.");
      this.params.scene = "__sandbox.xml";
      this.switchScene("__sandbox.xml");
      return;
    }
    if (!this.data || !this.model) return;

    const ndc = this.crosshair?._ndc ?? new THREE.Vector2(0, 0);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);

    // Priority: hit a grabbable body (drop ON it) → else hit ground plane y=0.
    let aim = null;
    const bodyHit = ray.intersectObjects(this.getGrabbables(), false)[0];
    if (bodyHit) {
      aim = bodyHit.point.clone();
    } else {
      // Manual ray/plane: y = 0. p = o + t*d where o.y + t*d.y = 0 → t = -o.y/d.y
      const o = ray.ray.origin, d = ray.ray.direction;
      if (Math.abs(d.y) > 1e-5) {
        const t = -o.y / d.y;
        if (t > 0) aim = new THREE.Vector3().copy(o).addScaledVector(d, t);
      }
    }
    if (!aim) return;

    const name = `spawn_${this._spawnCursor % 24}`;
    this._spawnCursor++;
    let ballID = -1;
    for (const [id, g] of Object.entries(this.bodies)) {
      if (g?.name === name) { ballID = Number(id); break; }
    }
    if (ballID < 0) return;

    // Aim.y is the surface y; drop from 1.4m above it to give gravity some work.
    const mjX = aim.x;
    const mjY = -aim.z;
    const mjZ = aim.y + 1.4;

    const jntadr = this.model.body_jntadr[ballID];
    const qposadr = this.model.jnt_qposadr[jntadr];
    const dofadr = this.model.jnt_dofadr[jntadr];
    this.data.qpos[qposadr + 0] = mjX;
    this.data.qpos[qposadr + 1] = mjY;
    this.data.qpos[qposadr + 2] = mjZ;
    this.data.qpos[qposadr + 3] = 1;
    this.data.qpos[qposadr + 4] = 0;
    this.data.qpos[qposadr + 5] = 0;
    this.data.qpos[qposadr + 6] = 0;
    for (let k = 0; k < 6; k++) this.data.qvel[dofadr + k] = 0;
    this.mujoco.mj_forward(this.model, this.data);
  }

  // Punch-at-crosshair (F key). Raycasts the crosshair; if it hits a grabbable
  // body, fires a short impulse along the camera-forward direction. Two paths:
  //  - freejoint body (sandbox prop, cannonball): instantaneous qvel kick +
  //    spawn-cursor-worth of angular spin, same recipe as middle-click punt.
  //  - articulated body (humanoid limb): queue a 3-frame xfrc_applied burst;
  //    the force layer runs AFTER applyWind + grabber.apply so our punch slot
  //    isn't clobbered. Mass-scaled so every body gets the same δv feel.
  punchAtAim() {
    if (!this.data || !this.model || this.params.paused) return;
    // Block punching while grabbing — the grabber owns xfrc for the grabbed
    // body; stacking a punch on top makes the spring explode.
    if (this.grabber?.active) return;

    const ndc = this.crosshair?._ndc ?? new THREE.Vector2(0, 0);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray.intersectObjects(this.getGrabbables(), false)[0];
    if (!hit) return;

    const bodyID = hit.object.bodyID;
    if (bodyID == null || bodyID <= 0) return;

    // Camera-forward in MJ world frame.
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const mjDx = camDir.x;
    const mjDy = -camDir.z;
    const mjDz = camDir.y;

    const mass = Math.max(0.05, this.model.body_mass?.[bodyID] ?? 1.0);
    const jntAdr = this.model.body_jntadr?.[bodyID];
    const jntType = jntAdr >= 0 ? this.model.jnt_type?.[jntAdr] : -1;

    if (jntType === 0) {
      // Freejoint — instant qvel kick, like punt but aimed via crosshair.
      const dofAdr = this.model.jnt_dofadr[jntAdr];
      const SPEED = 12.0;
      this.data.qvel[dofAdr + 0] = mjDx * SPEED;
      this.data.qvel[dofAdr + 1] = mjDy * SPEED;
      this.data.qvel[dofAdr + 2] = mjDz * SPEED + 1.5; // slight upward bias
      this.data.qvel[dofAdr + 3] = (Math.random() - 0.5) * 5;
      this.data.qvel[dofAdr + 4] = (Math.random() - 0.5) * 5;
      this.data.qvel[dofAdr + 5] = (Math.random() - 0.5) * 5;
    } else {
      // Articulated — enqueue a short xfrc burst. Targets δv ≈ 9 m/s at hit body
      // over ~3 frames @ 60 Hz. F·Δt = m·Δv → F = m·Δv / Δt = m·9 / 0.05 = 180·m.
      if (!this._punches) this._punches = [];
      this._punches.push({
        bodyID,
        fx: mjDx * 180 * mass,
        fy: mjDy * 180 * mass,
        fz: mjDz * 180 * mass,
        framesLeft: 3,
      });
    }

    // Visual ping: reuse the grabber's grabDot for a brief hit-point flash.
    if (this.grabber?.grabDot) {
      this.grabber.grabDot.position.copy(hit.point);
      this.grabber.grabDot.visible = true;
      this.grabber.grabDot.material.color.setHex(0xff6040);
      clearTimeout(this._punchFlashTimer);
      this._punchFlashTimer = setTimeout(() => {
        if (!this.grabber?.active) this.grabber.grabDot.visible = false;
      }, 110);
    }
  }

  // Apply queued punch bursts. Called per animate frame, AFTER applyWind +
  // grabber.apply, so the xfrc we write survives until stepPhysics consumes it.
  // Budget: ≤1 entry typical (keypress-driven), O(entries). No allocations.
  applyPunches() {
    const q = this._punches;
    if (!q || q.length === 0 || !this.data) return;
    const xfrc = this.data.xfrc_applied;
    for (let i = 0; i < q.length; i++) {
      const p = q[i];
      const off = p.bodyID * 6;
      // ADD — wind already wrote this slot; grabber wrote for its body (not ours).
      xfrc[off + 0] += p.fx;
      xfrc[off + 1] += p.fy;
      xfrc[off + 2] += p.fz;
      p.framesLeft--;
    }
    // Keep only still-live entries.
    this._punches = q.filter(p => p.framesLeft > 0);
  }

  // Catapult minigame — only meaningful in __catapult.xml. Resets the projectile
  // and kicks it with a ballistic arc aimed at the target ring (x=8, y=0). The
  // arc angle is 38° — close to the optimum for a point-launch at ground height
  // but slightly steeper so the projectile clears ground friction on landing.
  //  v_initial = sqrt(g · d / sin(2θ))   with d=8, g=9.81, θ=38° → ≈9.0 m/s
  launchProjectile() {
    if (this.currentScene !== "__catapult.xml") {
      console.info("Launch only works in __catapult.xml — switching.");
      this.params.scene = "__catapult.xml";
      this.switchScene("__catapult.xml");
      return;
    }
    if (!this.data || !this.model) return;

    let projID = -1;
    for (const [id, g] of Object.entries(this.bodies)) {
      if (g?.name === "catapult_projectile") { projID = Number(id); break; }
    }
    if (projID < 0) return;

    // Reset projectile qpos to home (0, 0, 1.2) and zero any prior qvel.
    const jntadr = this.model.body_jntadr[projID];
    const qposadr = this.model.jnt_qposadr[jntadr];
    const dofadr = this.model.jnt_dofadr[jntadr];
    this.data.qpos[qposadr + 0] = 0;
    this.data.qpos[qposadr + 1] = 0;
    this.data.qpos[qposadr + 2] = 1.2;
    this.data.qpos[qposadr + 3] = 1; // identity quat (w, x, y, z)
    this.data.qpos[qposadr + 4] = 0;
    this.data.qpos[qposadr + 5] = 0;
    this.data.qpos[qposadr + 6] = 0;
    for (let k = 0; k < 6; k++) this.data.qvel[dofadr + k] = 0;

    // Apply launch velocity: player-controlled angle + speed, +x direction.
    // Slight tumble for flair.
    const theta = (this.params.launchAngle ?? 38) * Math.PI / 180;
    const baseSpeed = this.params.launchSpeed ?? 9.0;
    const speed = baseSpeed + (Math.random() - 0.5) * 0.4; // tiny jitter so repeats aren't identical
    this.data.qvel[dofadr + 0] = speed * Math.cos(theta);
    this.data.qvel[dofadr + 1] = 0;
    this.data.qvel[dofadr + 2] = speed * Math.sin(theta);
    this.data.qvel[dofadr + 3] = (Math.random() - 0.5) * 4;
    this.data.qvel[dofadr + 4] = (Math.random() - 0.5) * 4;
    this.data.qvel[dofadr + 5] = (Math.random() - 0.5) * 4;
    this.mujoco.mj_forward(this.model, this.data);

    // Reset stored distance so the HUD drops while in flight.
    this._catapultLastDistance = null;
    this._catapultProjID = projID;
    this._catapultInFlight = true;
    this._catapultLaunchMs = performance.now();
  }

  // Once per frame in catapult scene: detects landing (low speed + low height)
  // after a minimum in-flight time, computes distance-to-target-center, stashes
  // it for the HUD. Zero cost outside catapult scene (early return).
  _updateCatapultScore() {
    if (this.currentScene !== "__catapult.xml" || !this._catapultInFlight) return;
    if (performance.now() - this._catapultLaunchMs < 400) return; // give it time to leave home
    const id = this._catapultProjID;
    if (id == null || id < 0) return;
    const x = this.data.xpos[id * 3 + 0];
    const y = this.data.xpos[id * 3 + 1];
    const z = this.data.xpos[id * 3 + 2];
    const jntadr = this.model.body_jntadr[id];
    const dofadr = this.model.jnt_dofadr[jntadr];
    const vx = this.data.qvel[dofadr + 0];
    const vy = this.data.qvel[dofadr + 1];
    const vz = this.data.qvel[dofadr + 2];
    const speed = Math.hypot(vx, vy, vz);
    // Landed when moving slowly and low to the ground.
    if (speed < 0.15 && z < 0.35) {
      this._catapultInFlight = false;
      const dx = x - 8, dy = y;
      const dist = Math.hypot(dx, dy);
      this._catapultLastDistance = dist;
      this._updateCatapultHud();
    }
  }

  // Small HUD chip, top-right, shows current status + last shot's distance.
  // DOM is created lazily on first use; updates only when the text changes.
  _updateCatapultHud() {
    const visible = this.currentScene === "__catapult.xml";
    let el = this._catapultHud;
    if (!el) {
      el = document.createElement("div");
      el.id = "catapult-hud";
      el.style.cssText = [
        "position:fixed", "top:14px", "right:320px", "z-index:10",
        "font:600 12px/1.2 system-ui,sans-serif", "letter-spacing:0.06em",
        "color:#e8f0ff", "text-shadow:0 1px 3px rgba(0,0,0,.6)",
        "background:rgba(20,30,55,.55)", "padding:8px 12px", "border-radius:8px",
        "border:1px solid rgba(180,210,255,.2)", "pointer-events:none",
        "display:none", "min-width:150px", "text-align:center",
      ].join(";");
      document.body.appendChild(el);
      this._catapultHud = el;
    }
    if (!visible) {
      if (el.style.display !== "none") el.style.display = "none";
      return;
    }

    let txt;
    if (this._catapultInFlight) txt = "🎯 In flight…";
    else if (this._catapultLastDistance == null) txt = "🎯 Press Launch";
    else {
      const d = this._catapultLastDistance;
      let medal = "";
      if (d < 0.35) medal = "🥇 BULLSEYE";
      else if (d < 0.75) medal = "🥈 AMBER";
      else if (d < 1.25) medal = "🥉 GREEN";
      else if (d < 1.9) medal = "🔵 BLUE";
      else medal = "📏 OUTSIDE";
      txt = `${medal}\n${d.toFixed(2)} m`;
    }
    if (el._lastTxt !== txt) {
      el._lastTxt = txt;
      el.innerHTML = txt.replace("\n", "<br>");
    }
    if (el.style.display !== "block") el.style.display = "block";
  }

  // Trajectory preview — dashed parabola from the projectile's home (0, 0, 1.2)
  // to the ideal ballistic landing point, based on the current launchAngle +
  // launchSpeed. Only visible in the catapult scene. Updates when either slider
  // changes OR when the scene becomes active (via _setupTrajectoryPreview).
  //
  // Math: 2-D ballistic in the xz plane.
  //   x(t) = v·cosθ·t
  //   z(t) = z0 + v·sinθ·t - 0.5·g·t²
  // Landing at z=0 → solve quadratic in t, pick positive root.
  // We sample N points along the flight and draw a dashed line through them.
  _updateTrajectoryPreview() {
    if (!this.scene) return;
    const visible = this.currentScene === "__catapult.xml";
    let line = this._trajLine;
    if (!line) {
      const geom = new THREE.BufferGeometry();
      const mat = new THREE.LineDashedMaterial({
        color: 0xffd878,
        dashSize: 0.25,
        gapSize: 0.14,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      });
      line = new THREE.Line(geom, mat);
      line.frustumCulled = false;
      this.scene.add(line);
      this._trajLine = line;
    }
    if (!visible) { line.visible = false; return; }

    const thetaDeg = this.params.launchAngle ?? 38;
    const speed = this.params.launchSpeed ?? 9.0;
    const theta = thetaDeg * Math.PI / 180;
    const vx = speed * Math.cos(theta);
    const vz = speed * Math.sin(theta);
    const g = -(this.model?.opt?.gravity?.[2] ?? 9.81);
    const z0 = 1.2;

    // Positive root of  -0.5·g·t² + vz·t + z0 = 0
    //   t = (vz + √(vz² + 2·g·z0)) / g
    const disc = vz * vz + 2 * g * z0;
    const tLand = disc > 0 ? (vz + Math.sqrt(disc)) / g : 0;
    const N = 48;
    const pts = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const t = (i / (N - 1)) * tLand;
      const xMj = vx * t;
      const zMj = z0 + vz * t - 0.5 * g * t * t;
      // MJ → THREE: (x, y, z)_mj → (x, z, -y)_three. y_mj = 0 here.
      pts[i * 3 + 0] = xMj;
      pts[i * 3 + 1] = Math.max(0, zMj); // clamp at ground so line doesn't dive below
      pts[i * 3 + 2] = 0;
    }
    line.geometry.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    line.geometry.computeBoundingSphere();
    line.computeLineDistances(); // required for dashed materials
    line.visible = true;
  }

  // Auto-engage the GetUpFSM when the humanoid is on the ground, settled,
  // and not being interacted with. Fires once per settle event; suppressed
  // while FSM is already active. Only runs in humanoid_getup.xml.
  //
  // Gating logic:
  //   - Scene must be humanoid_getup.xml (the forked XML with higher gears)
  //   - Param autoGetUp must be true
  //   - FSM must be idle (not already running)
  //   - Humanoid must NOT be upright (no point getting up if standing)
  //   - Humanoid must be settled (joint velocities quiet)
  //   - Grabber must not be active (user is currently manipulating)
  //   - No pending punches (recent impulse)
  _autoEngageGetUp(dt) {
    if (!this.params.autoGetUp) return;
    if (this.currentScene !== "humanoid_getup.xml") return;
    if (!this.humanoidCtrl || !this.getUpFSM) return;
    if (this.getUpFSM.state !== "idle") return;
    if (this.grabber?.active) return;
    if (this._punches && this._punches.length > 0) return;

    const settled = this.humanoidCtrl.isSettled(dt);
    if (!settled) return;

    const orient = this.humanoidCtrl.detectOrientation();
    if (orient === "upright") return;  // no need to get up

    // Fire.
    this.getUpFSM.start(orient);
  }

  fireCannon() {
    if (!this.data || !this.model) return;
    // Find a body named "cannonball" by scanning this.bodies; fall back to searching MuJoCo names.
    let ballID = -1;
    for (const [id, g] of Object.entries(this.bodies)) {
      if (g?.name === "cannonball") { ballID = Number(id); break; }
    }
    if (ballID < 0) {
      console.warn("No cannonball body in current scene — switch to __pyramid.xml");
      return;
    }
    // Reset ball's qvel/qpos to a firing position if this is a repeat shot.
    // Simpler: just apply a one-shot impulse along +x toward origin.
    // Reset first so repeated shots start from a fresh pyramid + ball position.
    this.mujoco.mj_resetData(this.model, this.data);
    this.mujoco.mj_forward(this.model, this.data);
    // Directly set the ball's linear velocity on its freejoint. qvel is in MuJoCo world frame (z-up).
    const jntadr = this.model.body_jntadr[ballID];
    const dofadr = this.model.jnt_dofadr[jntadr];
    this.data.qvel[dofadr + 0] = 11;  // +x velocity (toward pyramid at origin)
    this.data.qvel[dofadr + 1] = 0;
    this.data.qvel[dofadr + 2] = 3;   // small upward loft so it arcs into upper bricks
    this.mujoco.mj_forward(this.model, this.data);
  }

  onResize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
    this.bloom?.setSize(innerWidth * 0.5, innerHeight * 0.5);
  }

  // "PAUSED" chip — small pill in the bottom-right that appears while sim is paused.
  // Pure DOM; cheap. Visibility driven each frame from the animate() loop based on
  // the current params.paused state. Also pulses the chip gently so it's obvious.
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

  // Pick the hint preset based on interaction state. Writes innerHTML only on
  // change — cheap even called every frame.
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

  // Wind compass — small SVG rose in the lower-left that rotates with windDir
  // and fades in with magnitude. Invisible when wind=0, so it doesn't clutter
  // the default view. MJ heading: 0 = +x (east); rendered as a screen-space
  // compass with 0 radians pointing right, standard math convention.
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
    // Only show compass when the master toggle is on AND there's actual wind force;
    // otherwise the slider value is meaningless and the compass shouldn't mislead.
    const effectiveW = this.params.windEnabled ? this.params.wind : 0;
    const w = effectiveW;
    const dir = this.params.windDir;
    const cached = this._lastWindRender;
    // Skip write if nothing changed (common case, since wind sliders are idle).
    if (Math.abs(w - cached.w) < 0.01 && Math.abs(dir - cached.dir) < 0.005) return;
    cached.w = w; cached.dir = dir;

    // Fade in as wind ramps up; clamp fade curve.
    const alpha = Math.min(1, w / 6); // full opacity at ≥ 6 N
    this._windCompass.style.opacity = alpha.toFixed(3);
    // Arrow rotation: MJ heading → screen-space rotation. In SVG, y grows down,
    // so a +heading (CCW in MJ world) becomes -deg in SVG to look correct.
    const deg = -dir * (180 / Math.PI);
    this._windArrow.setAttribute("transform", `rotate(${deg.toFixed(1)})`);
    this._windMag.textContent = `${w.toFixed(1)} N`;
  }

  _updatePauseChip() {
    if (!this._pauseChip) return;
    const shouldShow = !!this.params.paused;
    const isShown = this._pauseChip.style.display !== "none";
    if (shouldShow !== isShown) {
      this._pauseChip.style.display = shouldShow ? "" : "none";
    }
  }

  // GMod-style "freeze everything" — walks every body, zeros qvel on any freejoint.
  // Articulated joints (hinge/ball) are also zeroed for thoroughness. One-shot action
  // via GUI button; physics resumes immediately so gravity will re-accumulate speed.
  freezeAll() {
    if (!this.model || !this.data) return;
    let frozen = 0;
    for (let b = 1; b < this.model.nbody; b++) {
      const jntAdr = this.model.body_jntadr[b];
      const numJnt = this.model.body_jntnum[b];
      if (jntAdr < 0 || numJnt <= 0) continue;
      for (let j = 0; j < numJnt; j++) {
        const ji = jntAdr + j;
        const dof = this.model.jnt_dofadr[ji];
        const type = this.model.jnt_type[ji];
        // dof widths: free=6, ball=3, hinge=1, slide=1
        const dofW = type === 0 ? 6 : type === 1 ? 3 : 1;
        for (let k = 0; k < dofW; k++) this.data.qvel[dof + k] = 0;
      }
      frozen++;
    }
    // Recompute derived state (forces, contact) with zeroed velocities.
    this.mujoco.mj_forward(this.model, this.data);
    return frozen;
  }

  // Applies a uniform horizontal wind force to every dynamic body via xfrc_applied.
  // Must run BEFORE the grabber so the grabber's per-body write overrides wind for
  // the currently-dragged body.
  // Scans contacts, bumps shakeEnergy on spikes, decays it each frame, and applies
  // a small noisy offset to the camera position. Called AFTER controls.update() and
  // cinematic orbit so the offset is a pure visual perturbation that gets undone next frame.
  updateScreenShake(dtSec) {
    // remove previous frame's offset so it doesn't accumulate
    this.camera.position.sub(this._shakeOffset);
    this._shakeOffset.set(0, 0, 0);

    if (!this.params.screenShake) { this.shakeEnergy = 0; return; }

    // Sample contacts for fresh spikes (cheap — we already do this elsewhere but
    // keeping shake independent so it works even if audio/sparks are off).
    if (this.data) {
      const d = this.data;
      const n = d.ncon;
      const seen = new Set();
      for (let i = 0; i < n; i++) {
        const c = d.contact.get(i);
        const key = c.geom1 + "_" + c.geom2;
        seen.add(key);
        const depth = Math.max(0, -c.dist);
        const prev = this._prevShakeSpikes.get(key) ?? 0;
        const delta = depth - prev;
        this._prevShakeSpikes.set(key, depth);
        if (delta > 0.0015) {
          this.shakeEnergy = Math.min(1.2, this.shakeEnergy + Math.min(0.6, delta * 150));
        }
      }
      for (const k of this._prevShakeSpikes.keys()) if (!seen.has(k)) this._prevShakeSpikes.delete(k);
    }

    // Exponential decay (~400 ms half-life)
    this.shakeEnergy *= Math.exp(-dtSec / 0.25);
    if (this.shakeEnergy < 0.002) { this.shakeEnergy = 0; return; }

    // Random offset in camera-local right/up axes so the shake tracks view orientation.
    const amp = this.shakeEnergy * 0.05; // meters at full energy
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();
    this._shakeOffset.copy(right).multiplyScalar((Math.random() - 0.5) * 2 * amp)
      .addScaledVector(up, (Math.random() - 0.5) * 2 * amp);
    this.camera.position.add(this._shakeOffset);
  }

  applyWind() {
    if (!this.data || !this.model) return;
    // Master toggle — wind sliders only take effect when "Wind" checkbox is on.
    // Default off so the humanoid doesn't drift around unless the user asks for it.
    const active = this.params.windEnabled && this.params.wind > 0;
    const w = active ? this.params.wind : 0;
    const fx = active ? w * Math.cos(this.params.windDir) : 0;
    const fy = active ? w * Math.sin(this.params.windDir) : 0;
    const xfrc = this.data.xfrc_applied;
    // Overwrite every body's wrench each frame — grabber runs after and will clobber
    // its one body's slot. This guarantees a slider change takes effect immediately.
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

  // Bullet-time blend [0..1] eases toward bulletTime target; bloom + time-dilation ramp follow it.
  updateBulletTime(dtSec) {
    const target = this.params.bulletTime ? 1 : 0;
    // exponential approach — ~300 ms to reach ~95% of target at dt=1/60
    const rate = 1 - Math.exp(-dtSec / 0.12);
    this.bulletBlend += (target - this.bulletBlend) * rate;
    if (Math.abs(target - this.bulletBlend) < 1e-4) this.bulletBlend = target;
    if (this.bloom) {
      this.bloom.strength = this._bloomBase + this.bulletBlend * 0.55;
    }
  }

  stepPhysics() {
    if (this.params.paused || !this.model) return;
    const timestep = this.model.opt.timestep;
    const bulletSlow = 1 - this.bulletBlend * 0.85; // 1.0 -> 0.15 at full bullet-time
    const wallDt = this.clock.getDelta() * 1000 * this.params.timescale * bulletSlow;
    if (this.mujocoTime === 0) this.mujocoTime = performance.now() - wallDt;
    this.mujocoTime += wallDt;
    const simStart = performance.now();
    while (this.mujocoTime < performance.now()) {
      this.mujoco.mj_step(this.model, this.data);
      this.mujocoTime += timestep * 1000;
      if (performance.now() - simStart > 30) break; // avoid runaway
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

  animate = () => {
    requestAnimationFrame(this.animate);
    const now = performance.now();
    const frameDt = this._lastFrameMs ? (now - this._lastFrameMs) / 1000 : 0;
    this._lastFrameMs = now;
    this.updateCamTween();
    this.updateCinematicOrbit(Math.min(frameDt, 0.05)); // clamp to 50 ms so tab-unfocus doesn't snap camera
    this.updateBulletTime(Math.min(frameDt, 0.05));
    this.controls.update();
    this.applyWind();
    this.grabber?.apply();
    this.applyPunches();
    this._autoEngageGetUp(Math.min(frameDt, 0.05));
    this.getUpFSM?.tick(Math.min(frameDt, 0.05));
    this.humanoidCtrl?.update();  // PD ctrl for humanoid self-right — no-op unless enabled
    this.stepPhysics();
    this.replay?.update(); // samples while live, scrubs qpos during replay (overrides stepPhysics output)
    this.syncMeshes();
    this.trails?.update();
    this.contactViz?.update();
    this.audio?.update();
    this.sparks?.update();
    this.metricsHud?.update();
    this.crosshair?.update();
    this.hoverHighlight?.update(); // per-frame, but only writes when target changes
    this._updateHints();            // cheap: textContent only on state change
    this._updateWindCompass();      // cheap: skips when wind+dir unchanged
    this._updatePauseChip();
    this._updateCatapultScore();    // no-op outside __catapult.xml
    this._updateCatapultHud();      // hides/shows chip; DOM text only on change
    this.updateScreenShake(Math.min(frameDt, 0.05));
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
