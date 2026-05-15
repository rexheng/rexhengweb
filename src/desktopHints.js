// Desktop first-run tutorial. Four ambient looping hints, dismissed
// individually as the user performs each action. Hints ①③④ track per-hint
// state in localStorage so the tutorial fades as the user learns the
// controls; ② is a persistent affordance shown every session (no gate).
//
//   ① drag-humanoid     — cursor fades in/out over scene centre, dismisses on canvas pointerdown
//   ② switch view (CV)  — amber pulse on the RH toggle + label, every session; fades on RH click within the load
//   ③ add a project     — text margin-annotation on the Projects section head
//   ④ double-click      — top-of-screen text, mounts only after first spawn
//
// Visual language matches mobileHints + the rest of the editorial chrome:
// IBM Plex Mono small-caps, ivory text with layered drop-shadow, translucent
// ivory AssistiveTouch-style cursor (16px outer ring, 8px inner dot).

import { isMobileLayout } from "./ui.js";

const STYLE_ID = "rex-desktop-hints-style";
const ROOT_ID  = "rex-desktop-hints";
const STORAGE  = "rex.desktopHints.";

const KEY = {
  drag:     STORAGE + "drag",
  project:  STORAGE + "project",
  dblclick: STORAGE + "dblclick",
};

function getFlag(k) {
  try { return localStorage.getItem(k) === "1"; } catch { return false; }
}
function setFlag(k) {
  try { localStorage.setItem(k, "1"); } catch { /* private mode etc. */ }
}

function fadeAndRemove(el) {
  if (!el || !el.isConnected) return;
  el.classList.add("rex-hint-out");
  window.setTimeout(() => el.remove(), 420);
}

// ─── styles ───────────────────────────────────────────────────────────
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
#${ROOT_ID} { position: fixed; inset: 0; z-index: 18; pointer-events: none; }

.rex-hint,
.rex-hint-cursor,
.rex-hint-pulse {
  position: absolute;
  pointer-events: none;
}

/* AssistiveTouch-style cursor: 16px translucent ring + 8px inner dot */
.rex-hint-cursor {
  width: 16px; height: 16px; border-radius: 50%;
  background: rgba(239,232,216,0.22);
  border: 1px solid rgba(239,232,216,0.55);
  box-shadow: 0 0 8px rgba(0,0,0,0.35), inset 0 0 1px rgba(0,0,0,0.25);
  transform-origin: 50% 50%;
}
.rex-hint-cursor::after {
  content: ""; position: absolute; inset: 4px; border-radius: 50%;
  background: rgba(239,232,216,0.95);
  box-shadow: 0 0 4px rgba(255,236,200,0.35);
}

/* bare hint text — matches .title-row .keys typography */
.rex-hint-label {
  position: absolute;
  font-family: var(--rex-font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--rex-ivory);
  text-shadow:
    0 1px 2px rgba(0,0,0,0.9),
    0 0 8px rgba(0,0,0,0.6),
    0 0 1px rgba(0,0,0,0.8);
  white-space: nowrap;
  pointer-events: none;
}

/* amber pulse ring around an anchor */
.rex-hint-pulse {
  border: 1px solid var(--rex-amber);
  opacity: 0;
}

/* fade-out animation when a hint is dismissed */
.rex-hint-out { opacity: 0 !important; transition: opacity 400ms ease; }

/* ──── HINT ①: drag humanoid — cursor hovers in place and fades in/out ─ */
.rex-hint-drag .rex-hint-cursor {
  left: 50%; top: 62%;
  animation: rexHintCenterFade 3.4s ease-in-out infinite;
}
@keyframes rexHintCenterFade {
  0%   { opacity: 0; transform: scale(0.88); }
  35%  { opacity: 1; transform: scale(1);    }
  65%  { opacity: 1; transform: scale(1);    }
  100% { opacity: 0; transform: scale(0.88); }
}
.rex-hint-drag .rex-hint-label {
  left: 50%; top: 78%;
  transform: translateX(-50%);
  text-align: center;
}

/* ──── HINT ②: RH toggle (switch view) — pulse + label only ──────────── */
.rex-hint-cv .rex-hint-pulse {
  /* sits over the 52×52 RH button, anchored 1px outside */
  animation: rexHintPulseRect 2.4s ease-out infinite;
}
@keyframes rexHintPulseRect {
  0%   { transform: scale(1);    opacity: 0.7; }
  80%  { transform: scale(1.25); opacity: 0;   }
  100% { transform: scale(1.25); opacity: 0;   }
}

/* ──── HINT ③: add a project (mounted inside Projects section head) ─ */
/* Renders as a sibling of the section-head's children so it scrolls with
   the panel. Positioned to the left of the panel via negative offset. */
.rex-hint-project-label {
  position: absolute;
  right: calc(100% + 16px);
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--rex-font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--rex-ivory);
  text-shadow:
    0 1px 2px rgba(0,0,0,0.9),
    0 0 8px rgba(0,0,0,0.6),
    0 0 1px rgba(0,0,0,0.8);
  white-space: nowrap;
  pointer-events: none;
  opacity: 1;
  transition: opacity 400ms ease;
}
.rex-hint-project-label.rex-hint-out { opacity: 0; }

/* ──── HINT ④: double-click prompt (top-of-screen) ─────────────────── */
.rex-hint-dblclick {
  left: 50%;
  top: 100px;
  transform: translateX(-50%);
  font-family: var(--rex-font-mono);
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--rex-ivory);
  text-shadow:
    0 1px 2px rgba(0,0,0,0.9),
    0 0 8px rgba(0,0,0,0.6),
    0 0 1px rgba(0,0,0,0.8);
  white-space: nowrap;
  pointer-events: none;
  animation: rexHintDblFade 600ms ease-in;
}
@keyframes rexHintDblFade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
  `;
  document.head.appendChild(s);
}

// ─── per-hint builders ────────────────────────────────────────────────
function mountHintDrag(root) {
  const wrap = document.createElement("div");
  wrap.className = "rex-hint rex-hint-drag";
  wrap.style.inset = "0";
  wrap.innerHTML = `
    <div class="rex-hint-cursor"></div>
    <div class="rex-hint-label">Drag to move me around</div>
  `;
  root.appendChild(wrap);
  return wrap;
}

function mountHintCV(root, rhEl) {
  const wrap = document.createElement("div");
  wrap.className = "rex-hint rex-hint-cv";
  wrap.style.inset = "0";

  const pulse = document.createElement("div");
  pulse.className = "rex-hint-pulse";

  const label = document.createElement("div");
  label.className = "rex-hint-label";
  label.textContent = "Switch view";

  wrap.appendChild(pulse);
  wrap.appendChild(label);
  root.appendChild(wrap);

  const place = () => {
    const r = rhEl.getBoundingClientRect();
    pulse.style.left   = `${r.left - 1}px`;
    pulse.style.top    = `${r.top  - 1}px`;
    pulse.style.width  = `${r.width + 2}px`;
    pulse.style.height = `${r.height + 2}px`;
    label.style.left = `${r.left - 4}px`;
    label.style.top  = `${r.bottom + 14}px`;
  };
  place();
  window.addEventListener("resize", place);

  return wrap;
}

function mountHintProject(projectsHead) {
  // Ensure the head is its own containing block so the absolute label resolves
  // to it instead of escaping up to #rex-controls. Section heads ship as
  // position:static by default.
  const prev = projectsHead.style.position;
  if (!prev) projectsHead.style.position = "relative";

  const label = document.createElement("div");
  label.className = "rex-hint-project-label";
  label.textContent = "Add a Project";
  projectsHead.appendChild(label);
  return label;
}

function mountHintDblclick(root) {
  if (root.querySelector(".rex-hint-dblclick")) return null;
  const el = document.createElement("div");
  el.className = "rex-hint rex-hint-dblclick";
  el.textContent = "Double click on the project and see what happens";
  root.appendChild(el);
  return el;
}

// ─── lifecycle ────────────────────────────────────────────────────────
export function initDesktopHints() {
  if (typeof document === "undefined") return;
  if (isMobileLayout()) return;
  if (document.getElementById(ROOT_ID)) return;

  ensureStyle();

  const root = document.createElement("div");
  root.id = ROOT_ID;
  document.body.appendChild(root);

  // HINT ① — drag humanoid
  let dragHint = null;
  if (!getFlag(KEY.drag)) {
    dragHint = mountHintDrag(root);
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const onDown = () => {
        setFlag(KEY.drag);
        fadeAndRemove(dragHint);
        canvas.removeEventListener("pointerdown", onDown);
      };
      canvas.addEventListener("pointerdown", onDown, { once: false });
    }
  }

  // HINT ② — switch view (RH toggle). Persistent affordance: shows every
  // session (no localStorage gate) so visitors always discover the CV view.
  // Dismisses within the current load when the RH button is clicked.
  {
    const rh = document.querySelector("#rex-portfolio-overlay .rex-toggle");
    if (rh) {
      const cvHint = mountHintCV(root, rh);
      const onDown = () => {
        fadeAndRemove(cvHint);
        rh.removeEventListener("mousedown", onDown);
      };
      rh.addEventListener("mousedown", onDown);
    }
  }

  // HINT ③ — add a project (annotation on the Projects sect-head)
  // HINT ④ — double-click (mounts on first spawn)
  const projectsHead = document.querySelector(
    '[data-section="projects"] .rex-section-head'
  );
  let projectHint = null;
  if (!getFlag(KEY.project) && projectsHead) {
    projectHint = mountHintProject(projectsHead);
  }

  // One delegated listener handles both ③ (dismiss) and ④ (mount).
  const onAnyClick = (e) => {
    const tile = e.target.closest(".rex-project-tile");
    if (!tile) return;
    if (projectHint) {
      setFlag(KEY.project);
      fadeAndRemove(projectHint);
      projectHint = null;
    }
    if (!getFlag(KEY.dblclick)) {
      // Defer one frame so the spawn animation kicks off first.
      requestAnimationFrame(() => {
        const dblHint = mountHintDblclick(root);
        if (!dblHint) return;
        const onDbl = () => {
          setFlag(KEY.dblclick);
          fadeAndRemove(dblHint);
          document.removeEventListener("dblclick", onDbl);
        };
        document.addEventListener("dblclick", onDbl);
      });
    }
  };
  document.addEventListener("click", onAnyClick, true);
}
