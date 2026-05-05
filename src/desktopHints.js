// Desktop ghost-overlay first-run hints. Mirrors mobileHints.js shape:
// idempotent, localStorage-gated to first visit, dismisses on first
// interaction. Bails out on mobile layouts (mobileHints handles those).
//
// Four anchored callouts:
//   01  Professional CTA      (top-left, pointer up)
//   02  Figure                (centre, pointer down — anchored to viewport,
//                              not the WebGL figure, since the humanoid moves)
//   03  Projects section      (right panel, pointer right)
//   04  Abilities (stub)      (bottom-centre, no pointer — placeholder until
//                              we wire real anchoring to the project card)

import { isMobileLayout } from "./ui.js";

const STORAGE_KEY = "rex.desktopHintsSeen";
const STYLE_ID = "rex-desktop-hints-style";
const OVERLAY_ID = "rex-desktop-hints";
const POINTER_GAP = 14;
const SHOW_DELAY_MS = 400;
const FADE_OUT_MS = 280;

const HINTS = [
  {
    id: "rex-hint-pro",
    eyebrow: "01 · Top-left",
    body: "Switch to my professional view",
    pointer: "up",
    anchor() {
      const el = document.querySelector("#rex-portfolio-overlay .rex-cta");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { kind: "below", x: r.left + 8, y: r.bottom + POINTER_GAP };
    },
  },
  {
    id: "rex-hint-figure",
    eyebrow: "02 · Drag",
    body: "Grab and toss me around",
    pointer: "down",
    anchor() {
      // Figure is in the WebGL canvas and moves under physics. Anchor to a
      // viewport-relative point above where the head sits at scene-rest.
      return { kind: "above", x: window.innerWidth / 2, yTarget: window.innerHeight * 0.5 };
    },
  },
  {
    id: "rex-hint-projects",
    eyebrow: "03 · Right panel",
    body: "Drop projects into the scene",
    pointer: "right",
    anchor() {
      const el = document.querySelector('#rex-controls [data-section="projects"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null; // hidden (panel collapsed)
      return { kind: "left-of", xTarget: r.left, y: r.top + 8 };
    },
  },
  {
    id: "rex-hint-abilities",
    eyebrow: "04 · Abilities",
    body: "Each project has its own ability",
    pointer: "none",
    anchor() {
      return { kind: "bottom-center", bottom: 56 };
    },
  },
];

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      z-index: 70;
      pointer-events: none;
    }
    #${OVERLAY_ID}.is-out .rex-desktop-hint {
      opacity: 0;
      transform: translate3d(0, 4px, 0);
    }
    .rex-desktop-hint {
      position: absolute;
      background: rgba(11, 14, 22, 0.78);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid var(--rex-rule-strong, rgba(214,207,188,0.42));
      padding: 12px 14px 11px;
      max-width: 220px;
      color: var(--rex-ivory, #efe8d8);
      font-family: var(--rex-font-mono, ui-monospace, monospace);
      font-size: 11px;
      line-height: 1.45;
      letter-spacing: 0.01em;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transition: opacity 220ms ease, transform 220ms ease;
    }
    .rex-desktop-hint .rex-hint-eyebrow {
      font-size: 9px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--rex-amber, #d4a05a);
      margin-bottom: 5px;
    }
    .rex-desktop-hint .rex-hint-body {
      font-family: var(--rex-font-serif, "Newsreader", Georgia, serif);
      font-style: italic;
      font-size: 15px;
      color: var(--rex-ivory, #efe8d8);
      line-height: 1.3;
    }
    .rex-desktop-hint::before {
      content: "";
      position: absolute;
      width: 0;
      height: 0;
      border: 7px solid transparent;
    }
    .rex-desktop-hint[data-pointer="up"]::before {
      top: -14px;
      left: 28px;
      border-bottom-color: rgba(11, 14, 22, 0.78);
    }
    .rex-desktop-hint[data-pointer="down"]::before {
      bottom: -14px;
      left: 50%;
      margin-left: -7px;
      border-top-color: rgba(11, 14, 22, 0.78);
    }
    .rex-desktop-hint[data-pointer="right"]::before {
      right: -14px;
      top: 18px;
      border-left-color: rgba(11, 14, 22, 0.78);
    }
    .rex-desktop-hint[data-pointer="none"] {
      text-align: center;
      max-width: 280px;
    }
  `;
  document.head.appendChild(s);
}

function buildOverlay() {
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.setAttribute("role", "region");
  overlay.setAttribute("aria-label", "First-time hints");
  for (const def of HINTS) {
    const hint = document.createElement("div");
    hint.id = def.id;
    hint.className = "rex-desktop-hint";
    hint.dataset.pointer = def.pointer;
    hint.innerHTML = `
      <div class="rex-hint-eyebrow">${def.eyebrow}</div>
      <div class="rex-hint-body">${def.body}</div>
    `;
    overlay.appendChild(hint);
  }
  document.body.appendChild(overlay);
  return overlay;
}

function positionAll(overlay) {
  for (const def of HINTS) {
    const el = overlay.querySelector(`#${def.id}`);
    if (!el) continue;
    const a = def.anchor();
    if (!a) {
      el.style.display = "none";
      continue;
    }
    el.style.display = "";
    if (a.kind === "below") {
      el.style.left = `${a.x}px`;
      el.style.top = `${a.y}px`;
      el.style.transform = "";
    } else if (a.kind === "above") {
      el.style.left = `${a.x}px`;
      el.style.transform = "translateX(-50%)";
      requestAnimationFrame(() => {
        el.style.top = `${a.yTarget - el.offsetHeight - POINTER_GAP}px`;
      });
    } else if (a.kind === "left-of") {
      el.style.top = `${a.y}px`;
      el.style.transform = "";
      requestAnimationFrame(() => {
        el.style.left = `${a.xTarget - el.offsetWidth - POINTER_GAP}px`;
      });
    } else if (a.kind === "bottom-center") {
      el.style.left = "50%";
      el.style.transform = "translateX(-50%)";
      el.style.bottom = `${a.bottom}px`;
      el.style.top = "";
    }
  }
}

/**
 * Mount the desktop hints overlay. Call once after `injectUI()`,
 * `initMobileShell()`, and `initMobileHints()`. Idempotent.
 */
export function initDesktopHints() {
  if (typeof document === "undefined") return;
  if (document.getElementById(OVERLAY_ID)) return;
  if (isMobileLayout()) return;

  let seen = false;
  try { seen = localStorage.getItem(STORAGE_KEY) === "1"; } catch (_) { /* ignore */ }
  if (seen) return;

  ensureStyle();

  let overlay = null;
  let dismissed = false;

  const onResize = () => { if (overlay) positionAll(overlay); };

  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (_) { /* ignore */ }
    document.removeEventListener("mousedown", dismiss, { capture: true });
    document.removeEventListener("keydown", dismiss, { capture: true });
    window.removeEventListener("resize", onResize);
    if (!overlay) return;
    overlay.classList.add("is-out");
    window.setTimeout(() => {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, FADE_OUT_MS);
  };

  // Brief delay so the scene has time to paint before the hints fade in.
  window.setTimeout(() => {
    if (dismissed) return;
    if (isMobileLayout()) return; // viewport may have flipped during the delay
    overlay = buildOverlay();
    positionAll(overlay);
    document.addEventListener("mousedown", dismiss, { capture: true });
    document.addEventListener("keydown", dismiss, { capture: true });
    window.addEventListener("resize", onResize);
  }, SHOW_DELAY_MS);
}
