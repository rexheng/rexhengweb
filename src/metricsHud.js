// Real-time metrics overlay — top-left. Shows peak speed, peak impact depth,
// active contacts, and bodies-in-motion count. Styled via ui.js (#metrics-hud).

const DECAY_PER_SEC = 0.55;     // exponential decay rate for peak values
const MOTION_THRESHOLD = 0.05;  // linear speed > 0.05 m/s counts as "in motion"

export class MetricsHud {
  constructor(app) {
    this.app = app;
    this.enabled = true;

    this.el = document.createElement("div");
    this.el.id = "metrics-hud";
    this.el.innerHTML = `
      <div class="m-head"><span>Metrics</span><span>·</span></div>
      <div class="m-row"><span class="m-label">FPS</span><span class="m-value" data-k="fps">–</span></div>
      <div class="m-row"><span class="m-label">Peak Spd</span><span class="m-value" data-k="speed">0.00 m/s</span></div>
      <div class="m-row"><span class="m-label">Peak Hit</span><span class="m-value" data-k="depth">0.00 mm</span></div>
      <div class="m-row"><span class="m-label">Contacts</span><span class="m-value" data-k="ncon">0</span></div>
      <div class="m-row"><span class="m-label">Motion</span><span class="m-value" data-k="motion">0 / 0</span></div>
    `;
    document.body.appendChild(this.el);
    this._vFps = this.el.querySelector('[data-k="fps"]');
    this._vSpeed = this.el.querySelector('[data-k="speed"]');
    this._vDepth = this.el.querySelector('[data-k="depth"]');
    this._vNcon = this.el.querySelector('[data-k="ncon"]');
    this._vMotion = this.el.querySelector('[data-k="motion"]');

    this.peakSpeed = 0;
    this.peakDepth = 0;
    this._lastUpdateMs = performance.now();
    this._frame = 0;

    // FPS — rolling 30-frame average. update() is called once per
    // animation frame from main.js, so each invocation is one frame.
    this._fpsSamples = new Array(30).fill(16.67);
    this._fpsIdx = 0;
    this._fpsLastMs = performance.now();
  }

  setEnabled(v) {
    this.enabled = v;
    this.el.style.display = v ? "" : "none";
  }

  update() {
    if (!this.enabled) return;
    const now = performance.now();
    const dt = Math.min(0.2, (now - this._lastUpdateMs) / 1000);
    this._lastUpdateMs = now;

    // FPS sample — inter-frame delta, clamped so a single tab-background
    // pause doesn't spike the average. Rolling 30-sample window.
    const frameDeltaMs = Math.min(500, Math.max(1, now - this._fpsLastMs));
    this._fpsLastMs = now;
    this._fpsSamples[this._fpsIdx] = frameDeltaMs;
    this._fpsIdx = (this._fpsIdx + 1) % this._fpsSamples.length;

    const model = this.app.model;
    const data = this.app.data;
    if (!model || !data) return;

    let maxSpeed = 0;
    let moving = 0;
    const nbody = model.nbody;
    if (data.cvel && data.cvel.length >= nbody * 6) {
      for (let b = 1; b < nbody; b++) {
        const o = b * 6 + 3;
        const vx = data.cvel[o], vy = data.cvel[o + 1], vz = data.cvel[o + 2];
        const s = Math.hypot(vx, vy, vz);
        if (s > maxSpeed) maxSpeed = s;
        if (s > MOTION_THRESHOLD) moving++;
      }
    }

    let maxDepth = 0;
    const nc = data.ncon ?? 0;
    for (let i = 0; i < nc; i++) {
      const c = data.contact.get(i);
      const depth = Math.max(0, -c.dist);
      if (depth > maxDepth) maxDepth = depth;
    }

    const decay = Math.exp(-DECAY_PER_SEC * dt);
    this.peakSpeed = Math.max(maxSpeed, this.peakSpeed * decay);
    this.peakDepth = Math.max(maxDepth, this.peakDepth * decay);

    this._frame++;
    if (this._frame % 6 !== 0) return;

    const fmt = (x, digits) => (x >= 100 ? x.toFixed(0) : x.toFixed(digits));
    // Rolling mean of the sample buffer → FPS.
    let sum = 0;
    for (let i = 0; i < this._fpsSamples.length; i++) sum += this._fpsSamples[i];
    const avgMs = sum / this._fpsSamples.length;
    const fps = avgMs > 0 ? (1000 / avgMs) : 0;
    this._vFps.textContent = `${fps.toFixed(0)}`;
    this._vSpeed.textContent = `${fmt(this.peakSpeed, 2)} m/s`;
    this._vDepth.textContent = `${fmt(this.peakDepth * 1000, 2)} mm`;
    this._vNcon.textContent = `${nc}`;
    this._vMotion.textContent = `${moving} / ${nbody - 1}`;
  }
}
