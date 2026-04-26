// Mobile gesture-help: auto-shows a hint toast on first landing and mounts a
// permanent [i] button (top-right) that re-opens the hint on demand.
// No-op on desktop layouts.

import { isMobileLayout } from "./ui.js";
import { showHintToast } from "./toasts.js";

const STORAGE_KEY = "rex.hintsSeen";
const STYLE_ID = "rex-mobile-hints-style";
const BUTTON_ID = "rex-hints-button";

const HINT_ROWS = [
  { key: "Drag",            desc: "look around" },
  { key: "Two-finger drag", desc: "pan the camera" },
  { key: "Pinch",           desc: "zoom in / out" },
  { key: "Tap a project",   desc: "drop it into the scene" },
];

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    #${BUTTON_ID} {
      position: fixed;
      top: calc(env(safe-area-inset-top, 0px) + 12px);
      right: calc(env(safe-area-inset-right, 0px) + 12px);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid rgba(212, 160, 90, 0.45);
      background: rgba(18, 22, 34, 0.78);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: #f4ead8;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 14px;
      font-style: italic;
      font-weight: 600;
      line-height: 30px;
      text-align: center;
      padding: 0;
      cursor: pointer;
      z-index: 90;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      -webkit-tap-highlight-color: transparent;
    }
    #${BUTTON_ID}:active { transform: scale(0.94); }
    /* Desktop: hide the button. The mobile toast init also bails out, so this
       is just defensive in case the body class flips at runtime. */
    body:not(.rex-mobile) #${BUTTON_ID} { display: none; }
  `;
  document.head.appendChild(s);
}

function showHint(opts = {}) {
  return showHintToast(HINT_ROWS, {
    timeoutMs: opts.timeoutMs ?? 6000,
    dismissOnTouch: opts.dismissOnTouch !== false,
  });
}

/**
 * Mount the mobile hints UI. Call once after `injectUI()` and `initMobileShell()`.
 * Idempotent — safe to call multiple times.
 */
export function initMobileHints() {
  if (typeof document === "undefined") return;
  if (document.getElementById(BUTTON_ID)) return;
  if (!isMobileLayout()) return;

  ensureStyle();

  // Permanent [i] button — works on every visit.
  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.type = "button";
  btn.setAttribute("aria-label", "Show gesture guide");
  btn.textContent = "i";
  btn.addEventListener("click", () => {
    // Manual open: no auto-dismiss timeout, only first-touch dismisses.
    showHint({ timeoutMs: 0, dismissOnTouch: true });
  });
  document.body.appendChild(btn);

  // Auto-show on first landing only. localStorage is a soft preference; we
  // tolerate exceptions (private mode etc.) by falling through to "show".
  let seen = false;
  try { seen = localStorage.getItem(STORAGE_KEY) === "1"; } catch (_) { /* ignore */ }
  if (seen) return;

  // Brief delay so the scene has time to paint before the hint slides in.
  window.setTimeout(() => {
    if (!isMobileLayout()) return; // viewport may have flipped (rotation)
    showHint({ timeoutMs: 6000, dismissOnTouch: true });
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (_) { /* ignore */ }
  }, 400);
}
