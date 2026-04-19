// WebAudio contact ticks — plays a short filtered-noise impulse every time a
// new contact appears or a contact's penetration depth spikes past a threshold.
// No decoding needed; everything is generated with an AudioBufferSource of white
// noise + a BiquadFilter + an exponential envelope.

const NOISE_SECONDS = 0.2;
const VOICE_LIMIT = 8;             // concurrent hits
const MIN_GAP_MS = 45;              // per-contact re-trigger cooldown
const SPIKE_THRESHOLD = 0.0008;     // penetration delta that counts as "impact"

export class ContactAudio {
  constructor(app) {
    this.app = app;
    this.enabled = false;
    this.ctx = null;
    this.noise = null; // reusable noise AudioBuffer
    this.master = null;
    this.lastHit = new Map(); // contactKey -> performance.now()
    this.prevDepths = new Map(); // contactKey -> depth
    this.activeVoices = 0;
  }

  _boot() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Pre-generate a few seconds of noise for reuse
    const len = Math.floor(this.ctx.sampleRate * NOISE_SECONDS);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1);
    this.noise = buf;

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.25;
    this.master.connect(this.ctx.destination);
  }

  setEnabled(v) {
    this.enabled = v;
    if (v) {
      this._boot();
      if (this.ctx?.state === "suspended") this.ctx.resume();
    }
  }

  _playHit(depth, pos) {
    if (!this.ctx || this.activeVoices >= VOICE_LIMIT) return;
    const now = this.ctx.currentTime;
    // Impact strength 0..1 from penetration depth
    const t = Math.min(1, depth * 400);

    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.7 + Math.random() * 0.3; // slight pitch variation

    const filt = this.ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = 180 + t * 2200; // low thud → bright crack
    filt.Q.value = 6;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0, now);
    env.gain.linearRampToValueAtTime(0.8 + 0.6 * t, now + 0.004); // attack
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.12 + t * 0.1); // decay

    src.connect(filt).connect(env).connect(this.master);
    src.start(now);
    src.stop(now + 0.2);
    this.activeVoices++;
    src.onended = () => { this.activeVoices--; };
  }

  update() {
    if (!this.enabled || !this.ctx || !this.app.data) return;
    const d = this.app.data;
    const n = d.ncon;
    const now = performance.now();
    const seen = new Set();

    for (let i = 0; i < n; i++) {
      const c = d.contact.get(i);
      // Stable per-pair key (geom ids) — survives contact-list reordering better than index i.
      const key = c.geom1 + "_" + c.geom2;
      seen.add(key);
      const depth = Math.max(0, -c.dist);
      const prev = this.prevDepths.get(key) ?? 0;
      const delta = depth - prev;
      this.prevDepths.set(key, depth);

      const last = this.lastHit.get(key) || 0;
      if (delta > SPIKE_THRESHOLD && now - last > MIN_GAP_MS) {
        this.lastHit.set(key, now);
        this._playHit(depth, c.pos);
      }
    }

    // Forget contacts that have gone away so they re-trigger later
    for (const k of this.prevDepths.keys()) {
      if (!seen.has(k)) this.prevDepths.delete(k);
    }
  }
}
