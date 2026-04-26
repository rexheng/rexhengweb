// Lightweight toast utility. Two flavours:
//   showSpawnToast(message)  – bottom-center, 2s, used for project spawn feedback.
//   showHintToast(html, opts) – top-center, used for the mobile gesture hint
//                               (auto-dismisses after a timeout OR first canvas touch).
// Both share a stylesheet block injected on first call. Only one toast of each
// kind is mounted at a time — calling again replaces the live one.

const STYLE_ID = "rex-toast-style";
const SPAWN_HOST_ID = "rex-spawn-toast";
const HINT_HOST_ID = "rex-hint-toast";

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    .rex-toast {
      position: fixed;
      z-index: 80;
      padding: 10px 14px;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 12px;
      letter-spacing: 0.04em;
      color: #f4ead8;
      background: rgba(18, 22, 34, 0.78);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(212, 160, 90, 0.32);
      border-radius: 999px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.32);
      pointer-events: none;
      opacity: 0;
      transition: opacity 220ms ease, transform 260ms cubic-bezier(.2,.8,.2,1);
      white-space: nowrap;
      max-width: calc(100vw - 32px);
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .rex-toast--spawn {
      left: 50%;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 160px);
      transform: translate(-50%, 8px);
    }
    .rex-toast--spawn.is-in {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    .rex-toast--hint {
      left: 50%;
      top: calc(env(safe-area-inset-top, 0px) + 64px);
      transform: translate(-50%, -8px);
      white-space: normal;
      max-width: min(360px, calc(100vw - 32px));
      border-radius: 14px;
      padding: 12px 14px;
      line-height: 1.45;
      pointer-events: auto;
    }
    .rex-toast--hint.is-in {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    .rex-toast--hint .rex-toast-row { display: flex; gap: 8px; align-items: baseline; }
    .rex-toast--hint .rex-toast-row + .rex-toast-row { margin-top: 4px; }
    .rex-toast--hint .rex-toast-key {
      color: #d4a05a;
      font-weight: 600;
      flex: 0 0 auto;
      min-width: 6.5em;
    }
    .rex-toast--hint .rex-toast-desc { color: #f4ead8; }
  `;
  document.head.appendChild(s);
}

function clear(hostId) {
  const old = document.getElementById(hostId);
  if (old && old.parentNode) old.parentNode.removeChild(old);
}

/**
 * Bottom-center pill toast. Used for spawn feedback ("Added Foo · drag to grab").
 * Replaces any live spawn toast — never stacks. Dismisses after 2s.
 */
export function showSpawnToast(message) {
  if (typeof document === "undefined" || !message) return;
  ensureStyle();
  clear(SPAWN_HOST_ID);

  const el = document.createElement("div");
  el.id = SPAWN_HOST_ID;
  el.className = "rex-toast rex-toast--spawn";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.textContent = message;
  document.body.appendChild(el);

  // Force layout so the transition fires.
  void el.offsetWidth;
  el.classList.add("is-in");

  const tHide = window.setTimeout(() => {
    el.classList.remove("is-in");
  }, 2000);
  const tRemove = window.setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 2300);
  el._cancel = () => { clearTimeout(tHide); clearTimeout(tRemove); };
}

/**
 * Top-center sheet for the mobile gesture hint. `htmlRows` is an array of
 * { key, desc } objects rendered as a key/value grid.
 *
 * Options:
 *   timeoutMs       – auto-dismiss after this many ms (default: no timeout)
 *   dismissOnTouch  – also dismiss on the first touchstart on document (default true)
 *   onDismiss       – callback fired exactly once when the toast goes away
 */
export function showHintToast(htmlRows, opts = {}) {
  if (typeof document === "undefined") return () => {};
  ensureStyle();
  clear(HINT_HOST_ID);

  const el = document.createElement("div");
  el.id = HINT_HOST_ID;
  el.className = "rex-toast rex-toast--hint";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = htmlRows.map((r) => `
    <div class="rex-toast-row">
      <span class="rex-toast-key">${r.key}</span>
      <span class="rex-toast-desc">${r.desc}</span>
    </div>
  `).join("");
  document.body.appendChild(el);

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    el.classList.remove("is-in");
    window.setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 280);
    document.removeEventListener("touchstart", onTouch, { capture: true });
    if (opts.onDismiss) opts.onDismiss();
  };

  const onTouch = (e) => {
    // Don't dismiss when the touch lands on the hint itself (so reading is fine).
    if (el.contains(e.target)) return;
    dismiss();
  };

  void el.offsetWidth;
  el.classList.add("is-in");

  if (opts.dismissOnTouch !== false) {
    document.addEventListener("touchstart", onTouch, { capture: true });
  }
  if (opts.timeoutMs && opts.timeoutMs > 0) {
    window.setTimeout(dismiss, opts.timeoutMs);
  }

  return dismiss;
}
