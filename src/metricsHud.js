// Real-time metrics overlay — top-right corner. Shows peak speed, peak impact depth,
// active contacts, and bodies-in-motion count. Pure read from MuJoCo data, no writes.
// Peaks decay smoothly so the user sees "recent max" rather than all-time record.

const DECAY_PER_SEC = 0.55;     // exponential decay rate for peak values
const MOTION_THRESHOLD = 0.05;  // linear speed > 0.05 m/s counts as "in motion"

export class MetricsHud {
  constructor(app) {
    this.app = app;
    this.enabled = true;

    this.el = document.createElement("div");
    this.el.id = "metrics-hud";
    this.el.style.cssText = `
      position:fixed; top:8px; right:8px; z-index:10;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size:11px; line-height:1.45;
      color:#cfe3ff; background:rgba(14,20,32,0.72);
      padding:8px 10px; border-radius:6px;
      border:1px solid rgba(120,180,255,0.18);
      backdrop-filter: blur(6px);
      min-width:168px;
      pointer-events:none;
      user-select:none;
    `;
    document.body.appendChild(this.el);

    this.peakSpeed = 0;
    this.peakDepth = 0;
    this._lastUpdateMs = performance.now();
    this._frame = 0;
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

    const model = this.app.model;
    const data = this.app.data;
    if (!model || !data) return;

    // Scan linear speeds from cvel (MJ world: offset +3..+5 per body).
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

    // Scan contact penetration depths.
    let maxDepth = 0;
    const nc = data.ncon ?? 0;
    for (let i = 0; i < nc; i++) {
      const c = data.contact.get(i);
      const depth = Math.max(0, -c.dist);
      if (depth > maxDepth) maxDepth = depth;
    }

    // Exponential decay, replacement on spike.
    const decay = Math.exp(-DECAY_PER_SEC * dt);
    this.peakSpeed = Math.max(maxSpeed, this.peakSpeed * decay);
    this.peakDepth = Math.max(maxDepth, this.peakDepth * decay);

    // Throttle DOM writes to ~10 Hz to avoid layout thrash.
    this._frame++;
    if (this._frame % 6 !== 0) return;

    const fmt = (x, digits) => (x >= 100 ? x.toFixed(0) : x.toFixed(digits));
    this.el.innerHTML = `
      <div style="opacity:0.55;letter-spacing:0.08em;font-size:9px;">METRICS</div>
      <div>peak speed: <b style="color:#ffd96e">${fmt(this.peakSpeed, 2)} m/s</b></div>
      <div>peak impact: <b style="color:#ff8a6e">${fmt(this.peakDepth * 1000, 2)} mm</b></div>
      <div>contacts: <b style="color:#7ee8fa">${nc}</b></div>
      <div>in motion: <b style="color:#9dff6e">${moving}</b> / ${nbody - 1}</div>
    `;
  }
}
