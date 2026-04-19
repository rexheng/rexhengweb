// Slo-mo replay buffer.
//
// Samples a ring of (qpos, qvel) snapshots while live sim runs. Press R to enter
// replay mode: live physics pauses, we scrub through the ring at 0.3× real-time
// writing qpos/qvel + mj_forward each scrub tick. Canvas gets a sepia CSS filter
// for cinematic flavor. Press R again to abort.
//
// Cost budget:
//   • Sampling: one typed-array copy per SAMPLE_MS. At SAMPLE_MS=50 and nq<=100
//     that's ~100 floats every 50ms = 2k floats/s = negligible.
//   • Memory: CAPACITY × (nq + nv) × 8 bytes. Humanoid (nq=28, nv=27) × 80 frames
//     = ~35 KB. Trivial.
//   • Replay scrub: one buffer write + one mj_forward per animate frame. mj_forward
//     is the cheap kinematics-only call (no integration, no contact solve).
//
// Replay only captures rigid state. Contact visualization and sparks won't be
// "re-simulated"; that's fine — the rigid motion is the dramatic bit.

const CAPACITY = 80;    // samples held
const SAMPLE_MS = 50;   // sample cadence = 20Hz. 80 samples @ 50ms = 4s window.
const REPLAY_SPEED = 0.3; // 0.3× = slo-mo
const SEPIA_CSS = "sepia(0.75) contrast(1.08) brightness(0.95) saturate(1.1)";

export class Replay {
  constructor(app) {
    this.app = app;
    this.buf = [];          // {qpos: Float64Array, qvel: Float64Array, t: ms}
    this.head = 0;          // write index (ring)
    this.count = 0;         // filled count, ≤CAPACITY
    this._lastSampleMs = 0;
    this.active = false;    // true during replay
    this._scrubT = 0;       // replay playhead in ms (relative to oldest sample)
    this._savedPaused = false;

    // Banner overlay — only visible while replaying.
    const banner = document.createElement("div");
    banner.id = "replay-banner";
    banner.textContent = "◉ REPLAY";
    banner.style.cssText = [
      "position:fixed", "top:14px", "left:50%", "transform:translateX(-50%)",
      "font:600 13px/1 system-ui,sans-serif", "letter-spacing:0.12em",
      "color:#ffe8c2", "text-shadow:0 1px 4px rgba(0,0,0,.6)",
      "background:rgba(60,30,10,.55)", "padding:6px 14px", "border-radius:999px",
      "border:1px solid rgba(255,200,130,.35)", "pointer-events:none",
      "z-index:10", "display:none",
    ].join(";");
    document.body.appendChild(banner);
    this._banner = banner;

    // Wire R key — skip when typing in inputs. Coexists with existing hotkeys.
    addEventListener("keydown", (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.code === "KeyR") {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  // Called every animate frame. Samples when live; scrubs when replaying.
  update() {
    const nowMs = performance.now();
    if (this.active) {
      this._scrub(nowMs);
    } else {
      if (nowMs - this._lastSampleMs >= SAMPLE_MS) {
        this._sample(nowMs);
        this._lastSampleMs = nowMs;
      }
    }
  }

  _sample(nowMs) {
    const { data, model } = this.app;
    if (!data || !model) return;
    const slot = this.buf[this.head] ?? {
      qpos: new Float64Array(model.nq),
      qvel: new Float64Array(model.nv),
      t: 0,
    };
    slot.qpos.set(data.qpos);
    slot.qvel.set(data.qvel);
    slot.t = nowMs;
    this.buf[this.head] = slot;
    this.head = (this.head + 1) % CAPACITY;
    if (this.count < CAPACITY) this.count++;
  }

  // Returns samples in chronological order (oldest first).
  _ordered() {
    if (this.count === 0) return [];
    const out = [];
    const start = this.count < CAPACITY ? 0 : this.head;
    for (let i = 0; i < this.count; i++) {
      out.push(this.buf[(start + i) % CAPACITY]);
    }
    return out;
  }

  toggle() {
    if (this.active) this.stop();
    else this.start();
  }

  start() {
    if (this.active) return;
    if (this.count < 4) return; // need at least a few samples
    this.active = true;
    this._scrubT = 0;
    this._scrubStartMs = performance.now();
    this._savedPaused = this.app.params.paused;
    this.app.params.paused = true; // freeze live sim

    // Visual: sepia canvas + banner.
    const canvas = this.app.renderer?.domElement;
    if (canvas) canvas.style.filter = SEPIA_CSS;
    this._banner.style.display = "block";

    // Refresh pause chip since we toggled params.paused.
    this.app._updatePauseChip?.();
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    const canvas = this.app.renderer?.domElement;
    if (canvas) canvas.style.filter = "";
    this._banner.style.display = "none";
    // Restore live-sim pause state.
    this.app.params.paused = this._savedPaused;
    this.app._updatePauseChip?.();
    // Invalidate the clock delta so stepPhysics doesn't suddenly jump forward.
    this.app.clock?.getDelta?.();
    this.app.mujocoTime = 0;
  }

  _scrub(nowMs) {
    const frames = this._ordered();
    if (frames.length < 2) { this.stop(); return; }
    const firstT = frames[0].t;
    const totalMs = frames[frames.length - 1].t - firstT;
    // Elapsed wall time since replay started, scaled by REPLAY_SPEED.
    const elapsed = (nowMs - this._scrubStartMs) * REPLAY_SPEED;
    if (elapsed >= totalMs) {
      this.stop();
      return;
    }
    // Find surrounding frames by linear scan (CAPACITY small).
    let lo = 0;
    for (let i = 0; i < frames.length - 1; i++) {
      if (frames[i].t - firstT <= elapsed && frames[i + 1].t - firstT >= elapsed) {
        lo = i;
        break;
      }
    }
    const a = frames[lo];
    const b = frames[lo + 1] ?? a;
    const span = Math.max(1, b.t - a.t);
    const alpha = Math.min(1, Math.max(0, (elapsed - (a.t - firstT)) / span));

    // Linear interpolation of qpos. For quats this is sloppy (not slerp) but at
    // 20Hz sample cadence the adjacent frames are close enough that linear +
    // mj_forward's renormalization is visually fine.
    const { data, model } = this.app;
    const nq = model.nq, nv = model.nv;
    for (let i = 0; i < nq; i++) data.qpos[i] = a.qpos[i] + (b.qpos[i] - a.qpos[i]) * alpha;
    for (let i = 0; i < nv; i++) data.qvel[i] = a.qvel[i] + (b.qvel[i] - a.qvel[i]) * alpha;
    this.app.mujoco.mj_forward(model, data);
  }

  // Hook from scene-switch: drop the buffer so we don't replay a different scene's qpos.
  onSceneSwitch() {
    this.head = 0;
    this.count = 0;
    this.buf.length = 0;
    if (this.active) this.stop();
  }
}
