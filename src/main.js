import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { loadSceneFromURL, getPosition, getQuaternion } from "./mujocoLoader.js";
import { Grabber } from "./grabber.js";
import { Trails } from "./trails.js";
import { Sparks } from "./sparks.js";
import { MetricsHud } from "./metricsHud.js";
import { Crosshair } from "./crosshair.js";
import { HoverHighlight } from "./hoverHighlight.js";
import { Replay } from "./replay.js";
import { PortfolioOverlay } from "./portfolioOverlay.js";
import { ProjectSystem } from "./projects/system.js";
import { ControlsPanel } from "./controlsPanel.js";
import { PinSystem } from "./pinSystem.js";
import { injectUI } from "./ui.js";
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
      sparks: false,
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
    injectUI();
    this.mujoco = await load_mujoco();
    this.mujoco.FS.mkdir("/working");
    this.mujoco.FS.mount(this.mujoco.MEMFS, { root: "." }, "/working");
    const txt = await (await fetch("./assets/scenes/" + SCENE_FILE)).text();
    this.mujoco.FS.writeFile("/working/" + SCENE_FILE, txt);

    // Three.js scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121a2a);
    // No fog — visibility must stay crisp for the playground.

    // Gradient sky dome. Slowly rotates so the star field drifts imperceptibly
    // giving the scene a subtle "world is alive" motion without drawing the
    // eye away from the humanoid.
    const skyGeo = new THREE.SphereGeometry(120, 48, 24);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x0a1326) },
        midColor: { value: new THREE.Color(0x2a3a5c) },
        bottomColor: { value: new THREE.Color(0x6a5a4a) },
        offset: { value: 4 },
        uTime: { value: 0 },
      },
      vertexShader: `varying vec3 vWorldPos;
        void main() { vec4 wp = modelMatrix * vec4(position,1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `
        uniform vec3 topColor; uniform vec3 midColor; uniform vec3 bottomColor; uniform float offset;
        uniform float uTime;
        varying vec3 vWorldPos;

        // Cheap 3D hash → 0..1. Good enough for twinkle noise.
        float hash(vec3 p) {
          p = fract(p * vec3(443.8975, 397.2973, 491.1871));
          p += dot(p, p.yzx + 19.19);
          return fract((p.x + p.y) * p.z);
        }

        // Procedural star field via cell-based point sampling. Roughly 120
        // stars across the upper hemisphere; each cell on a rotated sphere
        // has at most one star, and cells with hash below a threshold are
        // empty so the distribution feels natural rather than grid-like.
        float stars(vec3 d) {
          // Rotate the sky direction slowly around the world-up axis so stars
          // drift across the dome. Full revolution every ~10 minutes.
          float ang = uTime * 0.0105;
          float ca = cos(ang), sa = sin(ang);
          vec3 rd = vec3(ca * d.x + sa * d.z, d.y, -sa * d.x + ca * d.z);

          // Fade stars below the horizon so we don't render specks through
          // the warm earth-colored lower hemisphere.
          float horizonMask = smoothstep(-0.05, 0.15, rd.y);
          if (horizonMask <= 0.0) return 0.0;

          // Grid the direction into cells. Higher density = more cells tested.
          // 28 cells per axis ≈ ~120 visible stars above horizon.
          vec3 cell = floor(rd * 28.0);
          float h = hash(cell);
          // 7% of cells actually host a star — keeps density natural.
          if (h < 0.93) return 0.0;

          // Star location within the cell — jitter so stars aren't on a grid.
          vec3 jitter = vec3(hash(cell + 1.3), hash(cell + 2.7), hash(cell + 4.1));
          vec3 starDir = normalize((cell + jitter) / 28.0 - 0.5);
          float d2 = 1.0 - dot(normalize(rd), starDir);

          // Per-star magnitude: some bright, most dim.
          float mag = pow(hash(cell + 7.7), 3.0);  // skews toward dim
          // Per-star twinkle — slow pulse at unique rate per star.
          float twinkleRate = 0.4 + 2.0 * hash(cell + 9.1);
          float twinklePhase = hash(cell + 12.3) * 6.2831;
          float twinkle = 0.75 + 0.25 * sin(uTime * twinkleRate + twinklePhase);

          // Star "disk" — gaussian-ish falloff. Tighten with higher exponent
          // so stars read as hard points rather than fuzzy blobs.
          float intensity = exp(-d2 * 9000.0) * mag * twinkle * horizonMask;
          return intensity;
        }

        void main() {
          vec3 nd = normalize(vWorldPos + vec3(0., offset, 0.));
          float h = nd.y;
          vec3 col = h > 0.0
            ? mix(midColor, topColor, pow(h, 0.55))
            : mix(midColor, bottomColor, pow(-h, 0.7));
          // Overlay stars (additive, pale warm-white so they blend with bloom).
          float s = stars(normalize(vWorldPos));
          col += vec3(1.0, 0.97, 0.92) * s * 1.6;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this._skyMat = skyMat;
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

    // FPS is now rendered as a row inside the MetricsHud (bottom-left).
    // The Stats widget is no longer used.

    this.controlsPanel = new ControlsPanel(this);

    // HUD
    const hud = document.createElement("div");
    hud.id = "hud";
    hud.innerHTML = `<h1>Rex Heng</h1><p id="hud-hints"></p>`;
    document.body.appendChild(hud);
    this._hintsEl = hud.querySelector("#hud-hints");
    this._currentHintKey = "";
    this._HINT_PRESETS = {
      idle:    `Left-drag grab · F pin · P punt · R replay`,
      hover:   `Left-drag to grab · F pin · P punt`,
      grab:    `Wheel push/pull · E/Q rotate · F toggle pin · Release to let go`,
      replay:  `◉ Slo-mo replay — press R again to return to live`,
    };
    this._updateHints();

    addEventListener("resize", () => this.onResize());

    await this.switchScene(this.currentScene);
    this.pinSystem = new PinSystem(this);
    this.grabber = new Grabber(this);
    this.trails = new Trails(this);
    this.trails.setEnabled(this.params.trails);
    this.sparks = new Sparks(this);
    this.sparks.setEnabled(this.params.sparks);
    this.metricsHud = new MetricsHud(this);
    this.crosshair = new Crosshair(this);
    this.hoverHighlight = new HoverHighlight(this);
    this.replay = new Replay(this);
    this._installPauseChip();

    this.projectSystem = new ProjectSystem(this);
    this.projectSystem.onSceneLoaded();

    // Portfolio overlay — collapsible, left-anchored.
    this.portfolio = new PortfolioOverlay({
      name: "Rex Heng",
      tagline: "PPE at LSE · building at the intersection of finance, policy, and code.",
      initials: "RH",
      links: [
        { label: "Email", href: "mailto:rexheng@gmail.com" },
        { label: "LinkedIn", href: "https://www.linkedin.com/in/rexheng/" },
        { label: "GitHub", href: "https://github.com/rexheng" },
        { label: "Resume", href: "/cv/" },
      ],
    });

    this.animate();
  }

  async switchScene(name) {
    // Drop any pins first — they reference bodyIDs in the OLD model, which
    // become dangling once we reload. Must run before we dispose meshes so
    // that original materials get restored to live objects (doesn't matter
    // for memory but keeps the logic clean).
    this.pinSystem?.clearAll();
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
    this._orbitCenter = null;
    this.frameCamera();
    this.trails?.onSceneSwitch();
    this.replay?.onSceneSwitch();
    this.projectSystem?.onSceneLoaded();
    this.controlsPanel?.refresh();
  }

  // Cache torso body id for cinematic orbit tracking.
  _indexHumanoid() {
    if (!this.model) return;
    this._torsoId = -1;
    const dec = new TextDecoder();
    const names = dec.decode(this.model.names);
    const read = (adr) => names.slice(adr).split("\0")[0];
    for (let b = 0; b < this.model.nbody; b++) {
      if (read(this.model.name_bodyadr[b]) === "torso") { this._torsoId = b; break; }
    }
  }

  resetSim() {
    if (!this.model) return;
    // Drop all pins so the reset keyframe actually takes — otherwise the
    // pin springs snap bodies back to their pre-reset world pose for the
    // next frame.
    this.pinSystem?.clearAll();
    this.mujoco.mj_resetData(this.model, this.data);
    this.mujoco.mj_forward(this.model, this.data);
    this._orbitCenter = null;
    this.frameCamera();
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

    // Advance a simulated target by (frame wall-dt × scale); step physics until
    // the accumulator has consumed at least that much simulated time. Cap at
    // 30 ms wall-clock per frame so heavy substeps don't starve render.
    const realDtMs = Math.min(50, this.clock.getDelta() * 1000);
    this._simAccumMs = (this._simAccumMs ?? 0) + realDtMs * scale;
    const stepMs = timestep * 1000;
    const simStart = performance.now();
    while (this._simAccumMs >= stepMs) {
      this.mujoco.mj_step(this.model, this.data);
      this._simAccumMs -= stepMs;
      if (performance.now() - simStart > 30) {
        this._simAccumMs = 0;
        break;
      }
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
    else if (g?.active) key = "grab";
    else if ((this.crosshair?.hoveredBodyID ?? -1) > 0) key = "hover";
    if (key === this._currentHintKey) return;
    this._currentHintKey = key;
    this._hintsEl.textContent = this._HINT_PRESETS[key];
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
    if (this._skyMat) this._skyMat.uniforms.uTime.value = now * 0.001;
    this.applyWind();
    this.grabber?.apply();
    this.pinSystem?.apply();
    this.stepPhysics();
    this.replay?.update();
    this.syncMeshes();
    this.trails?.update();
    this.sparks?.update();
    this.metricsHud?.update();
    this.crosshair?.update();
    this.hoverHighlight?.update();
    this._updateHints();
    this.projectSystem?.update();
    this.controlsPanel?.update();
    this._updatePauseChip();
    this.composer.render();
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
