// Custom control panel — fully replaces lil-gui with the Rex UI design system.
// Sections: Scene, Physics, Camera, Effects.
//
// Takes an options object { params, onChange } plus accessor callbacks for
// gravity + wind direction so two-way binding works cleanly.

const GRAVITY_OPTIONS = [
  { label: "Earth", value: -9.81 },
  { label: "Moon",  value: -1.62 },
  { label: "Space", value: 0 },
];

const TIMESCALE_OPTIONS = [
  { label: "0.25×", value: 0.25, key: "0.25×" },
  { label: "0.5×",  value: 0.5,  key: "0.5×" },
  { label: "1×",    value: 1.0,  key: "1×" },
  { label: "2×",    value: 2.0,  key: "2×" },
];

const COMPASS_DIRS = [
  { label: "N",  rad: Math.PI * 0.5, x: 0,     y: -1 },
  { label: "NE", rad: Math.PI * 0.25, x: 0.707, y: -0.707 },
  { label: "E",  rad: 0, x: 1,      y: 0 },
  { label: "SE", rad: -Math.PI * 0.25, x: 0.707, y: 0.707 },
  { label: "S",  rad: -Math.PI * 0.5, x: 0,     y: 1 },
  { label: "SW", rad: -Math.PI * 0.75, x: -0.707, y: 0.707 },
  { label: "W",  rad: Math.PI, x: -1, y: 0 },
  { label: "NW", rad: Math.PI * 0.75, x: -0.707, y: -0.707 },
];

export class ControlsPanel {
  constructor(app) {
    this.app = app;
    this.el = null;
    this._segBtns = { gravity: {}, timescale: {} };
    this._toggleEls = {};
    this._sliderEls = {};
    this._compassBtns = {};
    this._compassArrow = null;
    this._build();
    this.refresh();
  }

  _build() {
    const root = document.createElement("div");
    root.id = "rex-controls";
    root.innerHTML = `
      <header class="rex-panel-title">
        <div class="rex-panel-title-main">Controls</div>
        <div class="rex-panel-title-tag">Rex Heng · Playground</div>
      </header>
    `;

    // Scene section
    root.appendChild(this._section("Scene", [
      this._button("Reset", () => this.app.resetSim()),
      this._button("Random Perturb", () => this.app.randomPerturb()),
    ]));

    // Physics section — toggles + segmented controls + sliders + compass.
    const phys = this._sectionShell("Physics");
    phys.appendChild(this._row("Paused", this._toggle("paused", (v) => this._set("paused", v))));
    phys.appendChild(this._row("Hold Stand", this._toggle("standHold", (v) => this._set("standHold", v))));

    phys.appendChild(this._labelLine("Gravity"));
    phys.appendChild(this._segmented("gravity", GRAVITY_OPTIONS, (opt) => {
      this.app.params.gravityLabel = opt.label;
      if (this.app.model) this.app.model.opt.gravity[2] = opt.value;
    }));

    phys.appendChild(this._labelLine("Timescale"));
    phys.appendChild(this._segmented("timescale", TIMESCALE_OPTIONS, (opt) => {
      this.app.params.timescaleLabel = opt.key;
      // Clear the physics accumulator + clock so a scale change starts clean.
      this.app._simAccumMs = 0;
      this.app.clock?.getDelta?.();
    }));

    phys.appendChild(this._row("Wind", this._toggle("windEnabled", (v) => this._set("windEnabled", v))));
    phys.appendChild(this._sliderRow("Force", "wind", 0, 40, 0.5, (v) => `${v.toFixed(1)} N`));
    phys.appendChild(this._labelLine("Heading"));
    phys.appendChild(this._compass());

    root.appendChild(phys);

    // Camera
    const cam = this._sectionShell("Camera");
    cam.appendChild(this._row("Cinematic Orbit", this._toggle("orbit", (v) => this._set("orbit", v))));
    cam.appendChild(this._sliderRow("Speed", "orbitSpeed", 0.02, 0.6, 0.01, (v) => `${v.toFixed(2)} rad/s`));
    root.appendChild(cam);

    // Effects
    const fx = this._sectionShell("Effects");
    fx.appendChild(this._row("Trajectory Trails", this._toggle("trails", (v) => { this._set("trails", v); this.app.trails?.setEnabled(v); })));
    fx.appendChild(this._row("Impact Sparks", this._toggle("sparks", (v) => { this._set("sparks", v); this.app.sparks?.setEnabled(v); })));
    root.appendChild(fx);

    document.body.appendChild(root);
    this.el = root;
  }

  _section(headLabel, children) {
    const section = document.createElement("div");
    section.className = "rex-section";
    const h = document.createElement("div");
    h.className = "rex-section-head";
    h.textContent = headLabel;
    section.appendChild(h);
    for (const c of children) section.appendChild(c);
    return section;
  }
  _sectionShell(headLabel) {
    const section = document.createElement("div");
    section.className = "rex-section";
    const h = document.createElement("div");
    h.className = "rex-section-head";
    h.textContent = headLabel;
    section.appendChild(h);
    return section;
  }

  _row(label, controlEl) {
    const row = document.createElement("div");
    row.className = "rex-row";
    const lab = document.createElement("span");
    lab.className = "rex-row-label";
    lab.textContent = label;
    row.appendChild(lab);
    row.appendChild(controlEl);
    return row;
  }

  _labelLine(label) {
    const d = document.createElement("div");
    d.className = "rex-row-label";
    d.style.padding = "6px 18px 4px";
    d.textContent = label;
    return d;
  }

  _button(label, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "rex-btn";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  _toggle(paramKey, onChange) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rex-toggle-switch";
    btn.setAttribute("aria-label", paramKey);
    const cur = () => !!this.app.params[paramKey];
    const paint = () => btn.classList.toggle("on", cur());
    btn.addEventListener("click", () => {
      const next = !cur();
      onChange(next);
      paint();
    });
    this._toggleEls[paramKey] = { el: btn, paint };
    paint();
    return btn;
  }

  _sliderRow(label, paramKey, min, max, step, fmt) {
    const row = document.createElement("div");
    row.className = "rex-row";
    const lab = document.createElement("span");
    lab.className = "rex-row-label";
    lab.textContent = label;
    row.appendChild(lab);
    const wrap = document.createElement("div");
    wrap.className = "rex-slider";
    const input = document.createElement("input");
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = this.app.params[paramKey] ?? min;
    const val = document.createElement("span");
    val.className = "rex-slider-value";
    val.textContent = fmt(Number(input.value));
    input.addEventListener("input", () => {
      const v = Number(input.value);
      this.app.params[paramKey] = v;
      val.textContent = fmt(v);
    });
    wrap.appendChild(input);
    wrap.appendChild(val);
    row.appendChild(wrap);
    this._sliderEls[paramKey] = { input, val, fmt };
    return row;
  }

  _segmented(kind, options, onSelect) {
    const host = document.createElement("div");
    host.className = "rex-segmented";
    host.style.gridTemplateColumns = `repeat(${options.length}, 1fr)`;
    for (const opt of options) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = opt.label;
      b.addEventListener("click", () => {
        onSelect(opt);
        this._paintSegmented(kind);
      });
      this._segBtns[kind][opt.key ?? opt.label] = { btn: b, opt };
      host.appendChild(b);
    }
    return host;
  }

  _paintSegmented(kind) {
    const current =
      kind === "gravity" ? this.app.params.gravityLabel :
      kind === "timescale" ? this.app.params.timescaleLabel : null;
    for (const [key, { btn }] of Object.entries(this._segBtns[kind])) {
      btn.classList.toggle("active", key === current);
    }
  }

  _compass() {
    const wrap = document.createElement("div");
    wrap.className = "rex-compass";
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "-64 -64 128 128");
    wrap.appendChild(svg);

    // Outer ring
    const ring = document.createElementNS(ns, "circle");
    ring.setAttribute("cx", 0); ring.setAttribute("cy", 0); ring.setAttribute("r", 48);
    ring.setAttribute("class", "ring");
    svg.appendChild(ring);

    // Inner rings
    const innerRing = document.createElementNS(ns, "circle");
    innerRing.setAttribute("cx", 0); innerRing.setAttribute("cy", 0); innerRing.setAttribute("r", 28);
    innerRing.setAttribute("class", "ring");
    innerRing.setAttribute("stroke-dasharray", "2 3");
    innerRing.setAttribute("opacity", "0.5");
    svg.appendChild(innerRing);

    // Tick marks — 24 minor, 8 major
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2 - Math.PI / 2;
      const isMajor = i % 3 === 0;
      const r1 = isMajor ? 40 : 44;
      const r2 = 48;
      const x1 = Math.cos(ang) * r1;
      const y1 = Math.sin(ang) * r1;
      const x2 = Math.cos(ang) * r2;
      const y2 = Math.sin(ang) * r2;
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", x1.toFixed(2));
      line.setAttribute("y1", y1.toFixed(2));
      line.setAttribute("x2", x2.toFixed(2));
      line.setAttribute("y2", y2.toFixed(2));
      line.setAttribute("class", isMajor ? "tick major" : "tick");
      svg.appendChild(line);
    }

    // Arrow (rotates with windDir). Starts pointing +y (N) in SVG = up.
    const arrow = document.createElementNS(ns, "g");
    const shaft = document.createElementNS(ns, "line");
    shaft.setAttribute("x1", 0); shaft.setAttribute("y1", 14);
    shaft.setAttribute("x2", 0); shaft.setAttribute("y2", -28);
    shaft.setAttribute("class", "arrow");
    arrow.appendChild(shaft);
    const head = document.createElementNS(ns, "polyline");
    head.setAttribute("points", "-6,-20 0,-30 6,-20");
    head.setAttribute("class", "arrow");
    arrow.appendChild(head);
    // tail
    const tail = document.createElementNS(ns, "circle");
    tail.setAttribute("cx", 0); tail.setAttribute("cy", 14); tail.setAttribute("r", 3);
    tail.setAttribute("class", "arrow");
    tail.setAttribute("fill", "var(--rex-amber)");
    arrow.appendChild(tail);
    svg.appendChild(arrow);
    this._compassArrow = arrow;

    // Cardinal labels as click targets
    for (const { label, rad } of COMPASS_DIRS) {
      // In MJ, rad=0 points to +x (east), rad=π/2 points to +y (north).
      // In SVG, +x is east, -y is north. Screen angle θ from +x axis: for
      // MJ rad, position = (cos(rad), -sin(rad)) * r.
      const r = 56;
      const sx = Math.cos(rad) * r;
      const sy = -Math.sin(rad) * r;
      const t = document.createElementNS(ns, "text");
      t.setAttribute("x", sx.toFixed(2));
      t.setAttribute("y", sy.toFixed(2));
      t.setAttribute("class", "cardinal");
      t.textContent = label;
      t.addEventListener("click", () => {
        this.app.params.windDir = rad;
        this._updateCompass();
      });
      svg.appendChild(t);
      this._compassBtns[label] = t;
    }

    return wrap;
  }

  _updateCompass() {
    if (!this._compassArrow) return;
    // MJ heading → SVG rotation. MJ 0=east, SVG needs the arrow (currently pointing
    // up = north) rotated to match. Screen angle from +y-up: rad=0 should rotate
    // the arrow +90° (to point right/east); rad=π/2 should stay at 0° (north).
    const mjRad = this.app.params.windDir ?? 0;
    const svgDeg = 90 - (mjRad * 180 / Math.PI);
    this._compassArrow.setAttribute("transform", `rotate(${svgDeg.toFixed(2)})`);
    const on = this.app.params.windEnabled && (this.app.params.wind || 0) > 0;
    this._compassArrow.style.opacity = on ? "1" : "0.25";

    // Highlight nearest cardinal
    let nearest = "E", bestDiff = Infinity;
    for (const { label, rad } of COMPASS_DIRS) {
      let d = ((mjRad - rad + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      d = Math.abs(d);
      if (d < bestDiff) { bestDiff = d; nearest = label; }
    }
    for (const [label, el] of Object.entries(this._compassBtns)) {
      el.classList.toggle("active", label === nearest);
    }
  }

  _set(key, v) {
    this.app.params[key] = v;
  }

  refresh() {
    this._paintSegmented("gravity");
    this._paintSegmented("timescale");
    this._updateCompass();
    for (const key of Object.keys(this._toggleEls)) this._toggleEls[key].paint();
    for (const [key, { input, val, fmt }] of Object.entries(this._sliderEls)) {
      input.value = this.app.params[key];
      val.textContent = fmt(Number(input.value));
    }
  }

  // Called each frame so live-changing state (windEnabled/wind) keeps
  // the compass + slider badges in sync.
  update() {
    this._updateCompass();
    for (const [key, { input, val, fmt }] of Object.entries(this._sliderEls)) {
      const v = this.app.params[key];
      if (Math.abs(v - Number(input.value)) > 1e-4) {
        input.value = v;
        val.textContent = fmt(Number(v));
      }
    }
  }
}
