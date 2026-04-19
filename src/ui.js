// Unified design system for all HUD surfaces floating on top of the MuJoCo scene.
//
// Aesthetic: editorial / museum placard. Instrument Serif for display + titles,
// JetBrains Mono for values and small-caps labels. Ivory text on deep ink, with
// a single burnt-amber accent reserved for active state.
//
// Exports injectCSS() which installs <link> tags for Google Fonts + a large inline
// stylesheet covering every HUD class used across the app. Call once on boot.

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500;600&display=swap";

const CSS = `
:root {
  --rex-ink: #0b0e16;
  --rex-ink-2: #111622;
  --rex-ink-3: #1a2030;
  --rex-ivory: #efe8d8;
  --rex-ivory-2: #d5cdb8;
  --rex-ivory-3: #a69d87;
  --rex-amber: #d4a05a;
  --rex-amber-2: #e9b976;
  --rex-rule: rgba(214, 207, 188, 0.18);
  --rex-rule-strong: rgba(214, 207, 188, 0.42);
  --rex-font-serif: "Instrument Serif", "Iowan Old Style", "Palatino", serif;
  --rex-font-mono: "JetBrains Mono", "SF Mono", "Menlo", ui-monospace, monospace;
}

/* ─── Portfolio Overlay (left) ─────────────────────────────────────────── */
#rex-portfolio-overlay {
  position: fixed;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 15;
  color: var(--rex-ivory);
  user-select: none;
  font-family: var(--rex-font-mono);
}
#rex-portfolio-overlay .rex-toggle {
  width: 52px;
  height: 52px;
  background: var(--rex-ink-2);
  border: 1px solid var(--rex-rule-strong);
  color: var(--rex-ivory);
  font-family: var(--rex-font-serif);
  font-size: 22px;
  font-style: italic;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: background 220ms ease, transform 220ms ease, border-color 220ms ease;
  position: relative;
}
#rex-portfolio-overlay .rex-toggle::before {
  content: "";
  position: absolute;
  inset: 3px;
  border: 1px solid var(--rex-rule);
  pointer-events: none;
}
#rex-portfolio-overlay .rex-toggle:hover {
  background: var(--rex-ink-3);
  border-color: var(--rex-amber);
  color: var(--rex-amber);
}
#rex-portfolio-overlay .rex-panel {
  position: absolute;
  left: 0;
  top: 0;
  width: 296px;
  background: var(--rex-ink);
  border: 1px solid var(--rex-rule-strong);
  padding: 20px 22px 18px;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-6px);
  transition: opacity 220ms ease, transform 220ms ease;
}
#rex-portfolio-overlay.expanded .rex-panel {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}
#rex-portfolio-overlay.expanded .rex-toggle {
  opacity: 0;
  pointer-events: none;
  transform: translateX(-10px);
}
#rex-portfolio-overlay .rex-eyebrow {
  font-family: var(--rex-font-mono);
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--rex-amber);
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
#rex-portfolio-overlay .rex-eyebrow::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--rex-rule);
}
#rex-portfolio-overlay .rex-name {
  font-family: var(--rex-font-serif);
  font-style: italic;
  font-weight: 400;
  font-size: 32px;
  letter-spacing: -0.01em;
  line-height: 1;
  margin: 0 0 8px;
  color: var(--rex-ivory);
}
#rex-portfolio-overlay .rex-tagline {
  font-family: var(--rex-font-mono);
  font-size: 11px;
  line-height: 1.55;
  color: var(--rex-ivory-2);
  margin: 0 0 18px;
  letter-spacing: 0.01em;
}
#rex-portfolio-overlay .rex-links {
  border-top: 1px solid var(--rex-rule);
  margin-top: 8px;
}
#rex-portfolio-overlay .rex-links a {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid var(--rex-rule);
  color: var(--rex-ivory-2);
  text-decoration: none;
  font-family: var(--rex-font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: color 160ms ease, padding-left 220ms cubic-bezier(.2,.8,.2,1);
}
#rex-portfolio-overlay .rex-links a::before {
  content: "→";
  color: var(--rex-amber);
  opacity: 0;
  width: 0;
  overflow: hidden;
  transition: opacity 180ms ease, width 220ms cubic-bezier(.2,.8,.2,1);
}
#rex-portfolio-overlay .rex-links a:hover {
  color: var(--rex-amber);
  padding-left: 14px;
}
#rex-portfolio-overlay .rex-links a:hover::before {
  opacity: 1;
  width: 14px;
  margin-left: -14px;
}
#rex-portfolio-overlay .rex-close {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 22px;
  height: 22px;
  line-height: 18px;
  text-align: center;
  cursor: pointer;
  color: var(--rex-ivory-3);
  font-family: var(--rex-font-mono);
  font-size: 16px;
  transition: color 140ms ease;
}
#rex-portfolio-overlay .rex-close:hover { color: var(--rex-amber); }

/* ─── Control Panel (right) ────────────────────────────────────────────── */
#rex-controls {
  position: fixed;
  right: 22px;
  top: 22px;
  width: 280px;
  background: var(--rex-ink);
  border: 1px solid var(--rex-rule-strong);
  color: var(--rex-ivory);
  font-family: var(--rex-font-mono);
  font-size: 11px;
  letter-spacing: 0.01em;
  z-index: 14;
  user-select: none;
  max-height: calc(100vh - 44px);
  overflow-y: auto;
}
#rex-controls::-webkit-scrollbar { width: 6px; }
#rex-controls::-webkit-scrollbar-track { background: transparent; }
#rex-controls::-webkit-scrollbar-thumb { background: var(--rex-rule-strong); }

.rex-panel-title {
  padding: 14px 18px 12px;
  border-bottom: 1px solid var(--rex-rule-strong);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rex-panel-title-main {
  font-family: var(--rex-font-serif);
  font-style: italic;
  font-size: 18px;
  color: var(--rex-ivory);
}
.rex-panel-title-tag {
  font-family: var(--rex-font-mono);
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--rex-amber);
}

.rex-section {
  border-bottom: 1px solid var(--rex-rule);
}
.rex-section:last-child { border-bottom: 0; }

.rex-section-head {
  padding: 14px 18px 8px;
  font-size: 9.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--rex-ivory-3);
  display: flex;
  align-items: center;
  gap: 8px;
}
.rex-section-head::before {
  content: "";
  display: block;
  width: 8px;
  height: 1px;
  background: var(--rex-amber);
}

.rex-row {
  padding: 7px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 28px;
}
.rex-row-label {
  color: var(--rex-ivory-2);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 10px;
  flex-shrink: 0;
}
.rex-row-value {
  color: var(--rex-ivory);
  font-family: var(--rex-font-mono);
}

/* Buttons (primary action — Reset, Perturb) */
.rex-btn {
  display: block;
  width: calc(100% - 36px);
  margin: 6px 18px;
  padding: 9px 12px;
  background: transparent;
  color: var(--rex-ivory);
  border: 1px solid var(--rex-rule-strong);
  font-family: var(--rex-font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
}
.rex-btn::after {
  content: "→";
  color: var(--rex-amber);
  opacity: 0.7;
  transition: transform 180ms cubic-bezier(.2,.8,.2,1);
}
.rex-btn:hover {
  background: var(--rex-ink-2);
  color: var(--rex-amber);
  border-color: var(--rex-amber);
}
.rex-btn:hover::after {
  transform: translateX(4px);
}
.rex-btn:active { background: var(--rex-ink-3); }

/* Segmented control — used for gravity, timescale */
.rex-segmented {
  display: grid;
  gap: 0;
  margin: 4px 18px 8px;
  border: 1px solid var(--rex-rule-strong);
}
.rex-segmented button {
  background: transparent;
  color: var(--rex-ivory-2);
  border: 0;
  padding: 8px 6px;
  font-family: var(--rex-font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
  border-right: 1px solid var(--rex-rule);
}
.rex-segmented button:last-child { border-right: 0; }
.rex-segmented button:hover { color: var(--rex-ivory); background: var(--rex-ink-2); }
.rex-segmented button.active {
  background: var(--rex-amber);
  color: var(--rex-ink);
  font-weight: 500;
}

/* Toggle switch — inline, matches the typographic grid */
.rex-toggle-switch {
  width: 34px;
  height: 18px;
  border: 1px solid var(--rex-rule-strong);
  position: relative;
  cursor: pointer;
  background: transparent;
  padding: 0;
  flex-shrink: 0;
  transition: border-color 160ms ease, background 160ms ease;
}
.rex-toggle-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  background: var(--rex-ivory-3);
  transition: left 180ms cubic-bezier(.2,.8,.2,1), background 180ms ease;
}
.rex-toggle-switch.on {
  border-color: var(--rex-amber);
  background: rgba(212, 160, 90, 0.12);
}
.rex-toggle-switch.on::after {
  left: 18px;
  background: var(--rex-amber);
}

/* Slider — thin rule with ticked track */
.rex-slider {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}
.rex-slider input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 18px;
  background: transparent;
  cursor: pointer;
  margin: 0;
}
.rex-slider input[type="range"]::-webkit-slider-runnable-track {
  height: 1px;
  background: var(--rex-rule-strong);
}
.rex-slider input[type="range"]::-moz-range-track {
  height: 1px;
  background: var(--rex-rule-strong);
}
.rex-slider input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 12px;
  width: 2px;
  background: var(--rex-amber);
  margin-top: -6px;
  transition: height 160ms ease;
}
.rex-slider input[type="range"]::-moz-range-thumb {
  height: 12px;
  width: 2px;
  background: var(--rex-amber);
  border: 0;
  border-radius: 0;
}
.rex-slider input[type="range"]:hover::-webkit-slider-thumb { height: 16px; margin-top: -8px; }
.rex-slider-value {
  font-family: var(--rex-font-mono);
  font-size: 10px;
  color: var(--rex-amber);
  min-width: 44px;
  text-align: right;
}

/* Wind compass — circular SVG button picker */
.rex-compass {
  margin: 6px auto 12px;
  width: 128px;
  height: 128px;
  position: relative;
}
.rex-compass svg { width: 100%; height: 100%; display: block; overflow: visible; }
.rex-compass .cardinal {
  cursor: pointer;
  transition: fill 160ms ease;
  fill: var(--rex-ivory-3);
  font-family: var(--rex-font-mono);
  font-size: 7.5px;
  letter-spacing: 0.14em;
  text-anchor: middle;
  dominant-baseline: middle;
}
.rex-compass .cardinal:hover { fill: var(--rex-ivory); }
.rex-compass .cardinal.active { fill: var(--rex-amber); font-weight: 600; }
.rex-compass .tick {
  stroke: var(--rex-rule);
  stroke-width: 1;
}
.rex-compass .tick.major { stroke: var(--rex-rule-strong); }
.rex-compass .arrow {
  stroke: var(--rex-amber);
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: opacity 220ms ease;
  opacity: 0.95;
}
.rex-compass .ring {
  stroke: var(--rex-rule-strong);
  stroke-width: 1;
  fill: none;
}

/* ─── HUD surfaces ─────────────────────────────────────────────────────── */
#hud {
  position: fixed;
  bottom: 22px;
  left: 88px;
  pointer-events: none;
  z-index: 8;
  font-family: var(--rex-font-mono);
}
#hud h1 {
  margin: 0 0 4px;
  font-family: var(--rex-font-serif);
  font-style: italic;
  font-weight: 400;
  font-size: 22px;
  color: var(--rex-ivory);
  letter-spacing: -0.01em;
  line-height: 1;
}
#hud p {
  margin: 0;
  font-size: 10px;
  color: var(--rex-ivory-3);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

#pause-chip {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 20;
  font-family: var(--rex-font-mono);
  font-size: 9.5px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--rex-amber);
  background: var(--rex-ink);
  padding: 7px 14px;
  border: 1px solid var(--rex-amber);
  pointer-events: none;
  user-select: none;
  animation: rexPulse 1.6s ease-in-out infinite;
  display: none;
}
@keyframes rexPulse {
  0%, 100% { opacity: 0.78; }
  50% { opacity: 1; }
}

#metrics-hud {
  position: fixed;
  top: 22px;
  left: 22px;
  z-index: 10;
  font-family: var(--rex-font-mono);
  font-size: 10px;
  color: var(--rex-ivory-2);
  background: var(--rex-ink);
  border: 1px solid var(--rex-rule-strong);
  padding: 12px 14px;
  width: 180px;
  pointer-events: none;
  user-select: none;
  line-height: 1.8;
  box-sizing: border-box;
}
#metrics-hud .m-head {
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--rex-amber);
  padding-bottom: 6px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--rex-rule);
  display: flex;
  justify-content: space-between;
}
#metrics-hud .m-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}
#metrics-hud .m-label {
  color: var(--rex-ivory-3);
  letter-spacing: 0.12em;
  font-size: 9.5px;
  text-transform: uppercase;
}
#metrics-hud .m-value {
  color: var(--rex-ivory);
  font-variant-numeric: tabular-nums;
}

#wind-compass-hud {
  position: fixed;
  left: 22px;
  bottom: 74px;
  z-index: 9;
  pointer-events: none;
  user-select: none;
  opacity: 0;
  transition: opacity 220ms ease;
}

/* ─── Project floating labels ──────────────────────────────────────────── */
.rex-project-label {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 12;
  pointer-events: auto;
  background: rgba(11, 14, 22, 0.92);
  color: var(--rex-ivory);
  border: 1px solid var(--rex-rule-strong);
  padding: 6px 12px 6px 10px;
  font-family: var(--rex-font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: border-color 180ms ease, color 180ms ease, background 180ms ease;
  backdrop-filter: blur(4px);
}
.rex-project-label::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%);
  width: 1px;
  height: 20px;
  background: linear-gradient(to bottom, var(--rex-rule-strong), transparent);
}
.rex-project-label:hover {
  border-color: var(--accent, var(--rex-amber));
  color: var(--accent, var(--rex-amber));
  background: rgba(17, 22, 34, 0.96);
}
.rex-project-label-tick {
  display: inline-block;
  width: 4px;
  height: 4px;
  background: var(--accent, var(--rex-amber));
  box-shadow: 0 0 6px var(--accent, var(--rex-amber));
  animation: rexTick 2s ease-in-out infinite;
}
@keyframes rexTick {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}
.rex-project-label-arrow {
  color: var(--rex-ivory-3);
  font-size: 11px;
  transition: transform 180ms ease, color 180ms ease;
}
.rex-project-label:hover .rex-project-label-arrow {
  color: var(--accent, var(--rex-amber));
  transform: translate(2px, -2px);
}

/* ─── Project card ─────────────────────────────────────────────────────── */
#project-card {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -46%) scale(0.98);
  width: min(520px, calc(100vw - 48px));
  background: var(--rex-ink);
  border: 1px solid var(--rex-rule-strong);
  color: var(--rex-ivory);
  z-index: 30;
  font-family: var(--rex-font-mono);
  opacity: 0;
  transition: opacity 260ms ease, transform 260ms cubic-bezier(.2,.8,.2,1);
}
#project-card.is-open {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
#project-card::before {
  content: "";
  position: absolute;
  inset: 6px;
  border: 1px solid var(--rex-rule);
  pointer-events: none;
}
.rex-ui-card-head {
  display: grid;
  grid-template-columns: 52px 1fr 32px;
  gap: 14px;
  align-items: start;
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--rex-rule);
  position: relative;
}
.rex-ui-card-index {
  font-family: var(--rex-font-serif);
  font-style: italic;
  font-size: 28px;
  color: var(--accent, var(--rex-amber));
  line-height: 1;
}
.rex-ui-card-titles h2 {
  font-family: var(--rex-font-serif);
  font-style: italic;
  font-weight: 400;
  font-size: 34px;
  margin: 2px 0 6px;
  line-height: 1;
  letter-spacing: -0.01em;
}
.rex-ui-card-meta {
  font-size: 9px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--rex-amber);
  margin-bottom: 4px;
}
.rex-ui-card-sub {
  font-size: 10px;
  color: var(--rex-ivory-3);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.rex-ui-card-close {
  background: transparent;
  border: 1px solid var(--rex-rule);
  color: var(--rex-ivory-3);
  width: 32px;
  height: 32px;
  font-size: 16px;
  cursor: pointer;
  font-family: var(--rex-font-mono);
  transition: color 160ms ease, border-color 160ms ease;
}
.rex-ui-card-close:hover {
  color: var(--rex-amber);
  border-color: var(--rex-amber);
}
.rex-ui-card-body {
  padding: 18px 24px 20px;
}
.rex-ui-card-body p {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--rex-ivory-2);
  letter-spacing: 0.01em;
}
.rex-ui-card-links {
  display: flex;
  gap: 0;
  border-top: 1px solid var(--rex-rule);
}
.rex-ui-card-links a {
  flex: 1;
  padding: 14px 18px;
  color: var(--rex-ivory-2);
  text-decoration: none;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-align: center;
  border-right: 1px solid var(--rex-rule);
  transition: color 160ms ease, background 160ms ease;
}
.rex-ui-card-links a:last-child { border-right: 0; }
.rex-ui-card-links a:hover {
  color: var(--rex-amber);
  background: var(--rex-ink-2);
}

/* ─── Hide lil-gui entirely; we replace with rex-controls ───────────────── */
.lil-gui.root { display: none !important; }

/* ─── Canvas crosshair & stats tweaks to match ─────────────────────────── */
#stats { opacity: 0.45; }
`;

export function injectUI() {
  if (document.getElementById("rex-ui-fonts")) return;

  // Fonts
  const pre1 = document.createElement("link");
  pre1.rel = "preconnect";
  pre1.href = "https://fonts.googleapis.com";
  document.head.appendChild(pre1);

  const pre2 = document.createElement("link");
  pre2.rel = "preconnect";
  pre2.href = "https://fonts.gstatic.com";
  pre2.crossOrigin = "";
  document.head.appendChild(pre2);

  const fonts = document.createElement("link");
  fonts.id = "rex-ui-fonts";
  fonts.rel = "stylesheet";
  fonts.href = GOOGLE_FONTS_URL;
  document.head.appendChild(fonts);

  // Main stylesheet
  const style = document.createElement("style");
  style.id = "rex-ui-styles";
  style.textContent = CSS;
  document.head.appendChild(style);

  // Base body font override so fallbacks cascade.
  document.body.style.fontFamily = "var(--rex-font-mono)";
  document.body.style.background = "var(--rex-ink)";
  document.body.style.color = "var(--rex-ivory)";
}
