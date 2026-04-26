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
  top: 22px;
  z-index: 15;
  color: var(--rex-ivory);
  user-select: none;
  font-family: var(--rex-font-mono);
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
#rex-portfolio-overlay .rex-cta {
  display: inline-flex;
  align-items: center;
  height: 52px;
  padding: 0 18px;
  background: var(--rex-ink-2);
  border: 1px solid var(--rex-rule-strong);
  color: var(--rex-ivory);
  font-family: var(--rex-font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: background 220ms ease, border-color 220ms ease, color 220ms ease;
  white-space: nowrap;
}
#rex-portfolio-overlay .rex-cta::after {
  content: " →";
  margin-left: 8px;
  color: var(--rex-amber);
  letter-spacing: 0;
}
#rex-portfolio-overlay .rex-cta:hover {
  background: var(--rex-ink-3);
  border-color: var(--rex-amber);
  color: var(--rex-amber);
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
  display: flex;
  flex-direction: column;
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
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rex-amber);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 130px;
  margin-left: auto;
}
.rex-panel-collapse {
  background: transparent;
  border: 1px solid var(--rex-rule-strong);
  color: var(--rex-ivory-2);
  width: 22px;
  height: 22px;
  margin-left: 10px;
  font-family: var(--rex-font-mono);
  font-size: 14px;
  line-height: 18px;
  cursor: pointer;
  padding: 0;
  transition: color 140ms ease, border-color 140ms ease, background 140ms ease;
}
.rex-panel-collapse:hover {
  color: var(--rex-amber);
  border-color: var(--rex-amber);
  background: var(--rex-ink-2);
}
#rex-controls.is-collapsed { width: auto; }
#rex-controls.is-collapsed .rex-section { display: none; }
#rex-controls.is-collapsed .rex-panel-title { border-bottom: 0; }
#rex-controls.is-collapsed .rex-panel-title-tag { display: none; }

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
#hud-row {
  position: fixed;
  bottom: 22px;
  left: 22px;
  z-index: 10;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 16px;
  pointer-events: none;
}
#hud-row > * { pointer-events: auto; }
#hud {
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
  font-family: var(--rex-font-mono);
  font-size: 10px;
  color: var(--rex-ivory-2);
  background: var(--rex-ink);
  border: 1px solid var(--rex-rule-strong);
  padding: 12px 14px;
  width: 180px;
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
  align-items: center;
}
#metrics-hud .m-collapse {
  background: transparent;
  border: 1px solid var(--rex-rule);
  color: var(--rex-ivory-3);
  width: 18px;
  height: 18px;
  font-family: var(--rex-font-mono);
  font-size: 11px;
  line-height: 14px;
  cursor: pointer;
  padding: 0;
  transition: color 140ms ease, border-color 140ms ease;
}
#metrics-hud .m-collapse:hover {
  color: var(--rex-amber);
  border-color: var(--rex-amber);
}
#metrics-hud.is-collapsed { width: auto; padding: 8px 12px; }
#metrics-hud.is-collapsed .m-head { padding-bottom: 0; margin-bottom: 0; border-bottom: 0; }
#metrics-hud.is-collapsed .m-body { display: none; }
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
  margin: 0 0 16px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--rex-ivory-2);
  letter-spacing: 0.01em;
}
.rex-ui-card-ability {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  color: var(--accent, var(--rex-amber));
  border: 1px solid var(--accent, var(--rex-amber));
  padding: 10px 18px 10px 16px;
  font-family: var(--rex-font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}
.rex-ui-card-ability::after {
  content: "→";
  letter-spacing: 0;
  transition: transform 180ms cubic-bezier(.2,.8,.2,1);
}
.rex-ui-card-ability:hover {
  background: var(--accent, var(--rex-amber));
  color: var(--rex-ink);
}
.rex-ui-card-ability:hover::after { transform: translateX(4px); }
.rex-ui-card-ability:active { transform: translateY(1px); }
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

/* ─── Project grid (replaces the old "Add X" list) ─────────────────────── */
.rex-project-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  margin: 6px 18px 8px;
  background: var(--rex-rule);
  border: 1px solid var(--rex-rule);
}
.rex-project-tile {
  aspect-ratio: 1 / 1;
  background: var(--rex-ink);
  border: 0;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  font-family: var(--rex-font-mono);
  color: var(--rex-ivory-2);
  overflow: hidden;
  transition: background 140ms ease;
}
.rex-project-tile:hover { background: var(--rex-ink-2); }
.rex-project-tile .rex-tile-swatch {
  width: 30px;
  height: 30px;
  border-radius: 3px;
  margin-bottom: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rex-ink);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.02em;
  background: var(--accent, var(--rex-ivory-3));
  transition: filter 140ms ease;
}
.rex-project-tile:hover .rex-tile-swatch { filter: brightness(1.15); }
.rex-project-tile .rex-tile-name {
  font-size: 8.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--rex-ivory-2);
  line-height: 1.25;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.rex-project-tile:hover .rex-tile-name { color: var(--rex-amber); }
.rex-project-tile .rex-tile-pip {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--rex-amber);
  box-shadow: 0 0 6px rgba(212,160,90,0.6);
}
.rex-project-tile.is-active {
  background: var(--rex-ink-3);
}
.rex-project-tile.is-active .rex-tile-name { color: var(--rex-amber); }

.rex-project-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 18px 10px;
  font-size: 9.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rex-ivory-3);
}
.rex-project-foot button {
  background: transparent;
  border: 0;
  color: var(--rex-ivory-3);
  font-family: var(--rex-font-mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 4px 0;
  transition: color 140ms ease;
}
.rex-project-foot button:hover { color: var(--rex-amber); }

/* ─── Hide lil-gui entirely; we replace with rex-controls ───────────────── */
.lil-gui.root { display: none !important; }

/* ─── Canvas crosshair & stats tweaks to match ─────────────────────────── */
#stats { opacity: 0.45; }

/* ─── Touch surface: stop pinch/scroll while dragging in canvas ────────── */
canvas { touch-action: none; }

/* ─── Mobile / tablet — single-column, bottom-sheet controls ───────────── */
@media (max-width: 820px) {
  /* Portfolio overlay collapses by default; CTA hidden, only the toggle. */
  #rex-portfolio-overlay { left: 12px; top: 12px; gap: 6px; }
  #rex-portfolio-overlay .rex-cta { display: none; }
  #rex-portfolio-overlay .rex-toggle { width: 44px; height: 44px; font-size: 18px; }
  #rex-portfolio-overlay .rex-panel { width: min(280px, calc(100vw - 24px)); }

  /* Controls panel becomes a bottom sheet that the user pulls up. */
  #rex-controls {
    right: 0;
    left: 0;
    top: auto;
    bottom: 0;
    width: 100%;
    max-height: 56vh;
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
    transform: translateY(calc(100% - 44px));
    transition: transform 280ms cubic-bezier(.2,.8,.2,1);
    box-shadow: 0 -8px 24px rgba(0,0,0,0.45);
  }
  #rex-controls.is-open { transform: translateY(0); }

  /* Drag handle visible at the top of the sheet so the user knows it pulls. */
  #rex-controls .rex-panel-title {
    cursor: grab;
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--rex-ink);
    padding-top: 18px;
    touch-action: none;
  }
  #rex-controls .rex-panel-title:active { cursor: grabbing; }
  #rex-controls .rex-panel-title::before {
    content: "";
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 3px;
    background: var(--rex-rule-strong);
    border-radius: 2px;
  }
  /* Desktop collapse button is meaningless on mobile — the bottom sheet
     already handles open/close. Hide it so taps on the title-bar can't
     accidentally hit it and wipe the sections via .is-collapsed. */
  #rex-controls .rex-panel-collapse { display: none; }
  /* Belt-and-braces: if .is-collapsed sneaks in from a prior desktop
     session's localStorage, force sections visible inside the sheet. */
  #rex-controls.is-collapsed .rex-section { display: block; }
  /* While dragging, suppress the slide transition so the sheet tracks
     the finger 1:1 instead of easing on every pointermove. */
  #rex-controls.is-dragging { transition: none; }

  /* Mobile section order: Projects → Physics → Camera → Effects → Scene */
  #rex-controls header.rex-panel-title { order: 0; }
  #rex-controls [data-section="projects"] { order: 1; }
  #rex-controls [data-section="physics"]  { order: 2; }
  #rex-controls [data-section="camera"]   { order: 3; }
  #rex-controls [data-section="effects"]  { order: 4; }
  #rex-controls [data-section="scene"]    { order: 5; }

  /* Hide "Controls" title text and subtitle — handle already communicates it. */
  #rex-controls .rex-panel-title-main { display: none; }
  #rex-controls .rex-panel-title-tag  { display: none; }

  /* On mobile break the flex row apart: hud stays bottom-left,
     metrics moves to bottom-right as its own fixed element. */
  #hud-row {
    bottom: 12px;
    left: 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    /* Only #hud stays in this corner — metrics is repositioned below. */
  }
  #hud-row #metrics-hud {
    position: fixed;
    bottom: 12px;
    right: 12px;
    left: auto;
    width: 140px;
    padding: 8px 10px;
    font-size: 9px;
  }
  #hud {
    max-width: calc(100vw - 24px);
  }
  #hud h1 { font-size: 18px; }
  #hud p { font-size: 9px; }
  #metrics-hud .m-head { font-size: 8px; }
  #metrics-hud .m-label { font-size: 8.5px; }

  /* Pause chip moves above the controls handle. */
  #pause-chip { right: 12px; bottom: 56px; }

  /* Wind compass HUD hides on mobile to save room. */
  #wind-compass-hud { display: none; }

  /* Project labels — bigger, easier to tap. */
  .rex-project-label {
    padding: 9px 14px;
    font-size: 11px;
  }

  /* Project card fills the viewport with side padding. */
  #project-card {
    width: calc(100vw - 24px);
    max-width: 480px;
    max-height: calc(100vh - 24px);
    overflow-y: auto;
  }
  .rex-ui-card-head { padding: 18px 18px 12px; grid-template-columns: 36px 1fr 32px; gap: 10px; }
  .rex-ui-card-titles h2 { font-size: 24px; }
  .rex-ui-card-body { padding: 14px 18px 16px; }
  .rex-ui-card-body p { font-size: 11.5px; }

  /* Project grid — 2 columns on phones for bigger touch targets. */
  .rex-project-grid { grid-template-columns: repeat(2, 1fr); }
  .rex-project-tile { padding: 10px 6px; }
  .rex-project-tile .rex-tile-swatch { width: 34px; height: 34px; }
  .rex-project-tile .rex-tile-name { font-size: 9px; }

  /* Bigger toggle / segmented hit areas for fingers. */
  .rex-toggle-switch { width: 40px; height: 22px; }
  .rex-toggle-switch::after { width: 14px; height: 14px; }
  .rex-toggle-switch.on::after { left: 22px; }
  .rex-segmented button { padding: 11px 4px; font-size: 11px; }
  .rex-btn { padding: 12px 14px; font-size: 11px; }
  .rex-row { min-height: 36px; }

  /* Compass smaller. */
  .rex-compass { width: 96px; height: 96px; margin: 4px auto 8px; }
}

/* iOS / Safari safe-area: pad for the home-indicator. */
@supports (padding: max(0px)) {
  @media (max-width: 820px) {
    #rex-controls { padding-bottom: max(0px, env(safe-area-inset-bottom)); }
    #hud-row { left: max(12px, env(safe-area-inset-left)); bottom: max(12px, env(safe-area-inset-bottom)); }
    #hud-row #metrics-hud { right: max(12px, env(safe-area-inset-right)); bottom: max(12px, env(safe-area-inset-bottom)); }
  }
}

/* Body class hook for runtime mobile detection (e.g. coarse pointer + small). */
body.rex-mobile { /* reserved for JS-applied tweaks */ }
`;

/**
 * True if the current viewport should use the mobile/tablet layout.
 * Uses the same matchMedia query as the @media block in CSS so JS and CSS
 * agree on what "mobile" means.
 */
export function isMobileLayout() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 820px)").matches;
}

/**
 * Wire the mobile bottom-sheet behaviour: tap the title bar to open/close
 * the controls panel. Must run AFTER ControlsPanel has appended #rex-controls
 * to the DOM. Idempotent — safe to call multiple times.
 */
export function initMobileShell() {
  const root = document.getElementById("rex-controls");
  if (!root || root.dataset.mobileWired === "1") return;
  root.dataset.mobileWired = "1";

  const title = root.querySelector(".rex-panel-title");
  if (!title) return;

  // Sheet geometry. CSS sets transform: translateY(calc(100% - 44px)) when
  // closed and translateY(0) when .is-open. We compute the closed offset in
  // px so pointermove can interpolate between the two.
  const closedOffsetPx = () => Math.max(0, root.offsetHeight - 44);

  let dragState = null;
  const TAP_THRESHOLD_PX = 6;
  const TAP_THRESHOLD_MS = 250;

  const onPointerDown = (e) => {
    if (!isMobileLayout()) return;
    // Don't hijack pointers on inner controls — only the title acts as the handle.
    if (e.target.closest(".rex-panel-collapse")) return;
    dragState = {
      startY: e.clientY,
      startT: performance.now(),
      startOpen: root.classList.contains("is-open"),
      moved: false,
      pointerId: e.pointerId,
    };
    root.classList.add("is-dragging");
    try { title.setPointerCapture(e.pointerId); } catch {}
  };

  const onPointerMove = (e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const dy = e.clientY - dragState.startY;
    if (Math.abs(dy) > TAP_THRESHOLD_PX) dragState.moved = true;
    const base = dragState.startOpen ? 0 : closedOffsetPx();
    const next = Math.max(0, Math.min(closedOffsetPx(), base + dy));
    root.style.transform = `translateY(${next}px)`;
  };

  const onPointerUp = (e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const dy = e.clientY - dragState.startY;
    const dt = performance.now() - dragState.startT;
    root.classList.remove("is-dragging");
    root.style.transform = "";  // hand control back to CSS
    try { title.releasePointerCapture(e.pointerId); } catch {}

    const isTap = !dragState.moved && dt < TAP_THRESHOLD_MS;
    if (isTap) {
      root.classList.toggle("is-open");
    } else {
      // Settle: open/close based on distance OR velocity — whichever fires first.
      // 60px threshold feels responsive without accidental triggers.
      const SETTLE_PX = 60;
      const velocity = dt > 0 ? Math.abs(dy) / dt : 0; // px/ms
      const FLICK_V = 0.3;
      const isFlickUp   = dy < 0 && velocity >= FLICK_V;
      const isFlickDown = dy > 0 && velocity >= FLICK_V;
      let settledOpen;
      if (dragState.startOpen) {
        settledOpen = isFlickUp || (!isFlickDown && dy > -SETTLE_PX);
      } else {
        settledOpen = isFlickUp || (!isFlickDown && dy < -SETTLE_PX);
      }
      root.classList.toggle("is-open", settledOpen);
    }
    dragState = null;
  };

  title.addEventListener("pointerdown", onPointerDown);
  title.addEventListener("pointermove", onPointerMove);
  title.addEventListener("pointerup", onPointerUp);
  title.addEventListener("pointercancel", onPointerUp);

  // Tap outside the controls (on the canvas) closes the sheet so the user
  // can interact with the scene without it covering content.
  document.addEventListener("pointerdown", (e) => {
    if (!isMobileLayout()) return;
    if (!root.classList.contains("is-open")) return;
    if (e.target.closest("#rex-controls")) return;
    root.classList.remove("is-open");
  });

  // Apply body class so any future selectors can target mobile only.
  document.body.classList.toggle("rex-mobile", isMobileLayout());
  window.addEventListener("resize", () => {
    document.body.classList.toggle("rex-mobile", isMobileLayout());
  });
}

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
