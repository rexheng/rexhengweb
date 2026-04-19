// Spark particle burst — spawns short-lived glowing Points at contact points whose
// penetration depth spikes hard. Shares trigger logic with ContactAudio (per-geom-pair
// delta threshold + cooldown) but is an entirely separate system so each can be toggled
// independently.
import * as THREE from "three";

const MAX_PARTICLES = 512;
const SPARKS_PER_HIT = 14;
const LIFE_SEC = 0.55;
const GRAVITY = -9.0;
const SPIKE_THRESHOLD = 0.0012;
const MIN_GAP_MS = 60;

export class Sparks {
  constructor(app) {
    this.app = app;
    this.enabled = false;

    // Parallel SoA buffers.
    this.pos = new Float32Array(MAX_PARTICLES * 3);
    this.vel = new Float32Array(MAX_PARTICLES * 3);
    this.age = new Float32Array(MAX_PARTICLES);    // seconds lived
    this.life = new Float32Array(MAX_PARTICLES);   // total life in seconds, 0 = dead
    this.col = new Float32Array(MAX_PARTICLES * 3);

    this.cursor = 0;
    this.prevDepths = new Map(); // same idea as ContactAudio
    this.lastHit = new Map();

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
    geom.setDrawRange(0, 0);

    const mat = new THREE.PointsMaterial({
      size: 0.045,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });

    this.points = new THREE.Points(geom, mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    app.scene.add(this.points);

    this._lastUpdateMs = performance.now();
  }

  setEnabled(v) {
    this.enabled = v;
    this.points.visible = v;
    if (!v) {
      this.age.fill(0);
      this.life.fill(0);
      this.points.geometry.setDrawRange(0, 0);
    }
  }

  _spawnHit(posThree, strength) {
    // Emit SPARKS_PER_HIT particles in a half-sphere centered on posThree.
    for (let i = 0; i < SPARKS_PER_HIT; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % MAX_PARTICLES;
      const j = idx * 3;

      // Random unit vector in upper hemisphere (y>=0 bias) + radial outward
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - Math.random() * 0.85); // bias toward up
      const sx = Math.sin(phi) * Math.cos(theta);
      const sy = Math.cos(phi);
      const sz = Math.sin(phi) * Math.sin(theta);
      const speed = 1.6 + Math.random() * 2.8 * strength;

      this.pos[j + 0] = posThree.x;
      this.pos[j + 1] = posThree.y;
      this.pos[j + 2] = posThree.z;
      this.vel[j + 0] = sx * speed;
      this.vel[j + 1] = sy * speed;
      this.vel[j + 2] = sz * speed;

      // Warm sparks: yellow-white to orange, tinted by strength
      const t = Math.min(1, strength);
      this.col[j + 0] = 1.0;
      this.col[j + 1] = 0.85 - 0.4 * t;
      this.col[j + 2] = 0.3 - 0.25 * t;

      this.age[idx] = 0;
      this.life[idx] = LIFE_SEC * (0.7 + Math.random() * 0.6);
    }
  }

  update() {
    const nowMs = performance.now();
    const dt = Math.min(0.05, (nowMs - this._lastUpdateMs) / 1000);
    this._lastUpdateMs = nowMs;

    // Advance live particles
    if (this.enabled) {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (this.life[i] <= 0) continue;
        const j = i * 3;
        this.age[i] += dt;
        if (this.age[i] >= this.life[i]) {
          this.life[i] = 0;
          // Move offscreen-ish so it's not rendered
          this.pos[j + 1] = -9999;
          continue;
        }
        // Euler integration
        this.vel[j + 1] += GRAVITY * dt;
        this.pos[j + 0] += this.vel[j + 0] * dt;
        this.pos[j + 1] += this.vel[j + 1] * dt;
        this.pos[j + 2] += this.vel[j + 2] * dt;
        // Fade via alpha: scale color toward zero
        const a = 1 - this.age[i] / this.life[i];
        this.col[j + 0] *= 0.985;
        this.col[j + 1] *= 0.985;
        this.col[j + 2] *= 0.985;
        // keep alpha implicit via color attenuation since PointsMaterial doesn't do per-vertex alpha
        void a;
      }
      this.points.geometry.attributes.position.needsUpdate = true;
      this.points.geometry.attributes.color.needsUpdate = true;
      this.points.geometry.setDrawRange(0, MAX_PARTICLES);
    }

    // Scan contacts for fresh spikes (runs regardless of enabled? only when enabled).
    if (!this.enabled || !this.app.data) return;
    const d = this.app.data;
    const n = d.ncon;
    const seen = new Set();
    for (let i = 0; i < n; i++) {
      const c = d.contact.get(i);
      const key = c.geom1 + "_" + c.geom2;
      seen.add(key);
      const depth = Math.max(0, -c.dist);
      const prev = this.prevDepths.get(key) ?? 0;
      const delta = depth - prev;
      this.prevDepths.set(key, depth);
      const last = this.lastHit.get(key) || 0;
      if (delta > SPIKE_THRESHOLD && nowMs - last > MIN_GAP_MS) {
        this.lastHit.set(key, nowMs);
        // MJ→THREE swizzle for contact position
        const p = new THREE.Vector3(c.pos[0], c.pos[2], -c.pos[1]);
        const strength = Math.min(1, depth * 300);
        this._spawnHit(p, 0.3 + strength);
      }
    }
    for (const k of this.prevDepths.keys()) if (!seen.has(k)) this.prevDepths.delete(k);
  }
}
