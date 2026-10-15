// Morph ability — "spin-swap" the sprite into the next shape in its ring.
//
// Used by the mechanica sprite. The builder hangs a ring of pre-built parts
// on the mesh as `mesh._morph = { parts: [{ id, name, pivot }], index, stage }`.
// Each `pivot` sits at its part's base centre (on the floor, xz-centred), so
// turning it spins the part about its own vertical axis and scaling it keeps
// the base planted on the floor.
//
// Each invocation (~500 ms, advanced by the dtMs ProjectSystem passes to tick):
//   1. Spin-up: the current part turns a quarter turn about +y with an
//      ease-in, so it is spinning fastest as it goes edge-on, and eases down
//      to 92% scale.
//   2. Swap, at that fastest moment: the current pivot is detached (kept for
//      reuse) and the next one attached in the same tick, so no frame is ever
//      empty or doubled. Its meshes get the slot bodyID and grabbables are
//      rebuilt so it stays clickable; the floating label becomes
//      "<label> · <part name>".
//   3. Spin-down: the next part carries on the same spin from a quarter turn
//      back and eases out to its rest pose, settling 92% → 100% scale.
//      Ease-in-cubic into ease-out-cubic over equal halves keeps the angular
//      speed continuous across the swap.
//
// No FX and no material changes: the parts render exactly as they do at
// rest. Physics is untouched: the hitbox is a fixed envelope chosen by the
// def, so nothing is resized mid-rest. Firing again mid-morph queues one
// more step (up to MAX_QUEUE) rather than snapping, so rapid double-clicks
// still read as smooth transitions.

const DURATION_MS = 500;
const SWAP_AT = 0.5;              // fraction of DURATION_MS
const QUARTER_TURN = Math.PI / 2;
const SWAP_SCALE = 0.92;          // scale at the swap; 1 at rest
const MAX_QUEUE = 2;

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeInCubic = (x) => x * x * x;
const easeOutCubic = (x) => 1 - (1 - x) ** 3;

function setLabel(slot, name) {
  if (!slot?.labelEl || !name) return;
  const textEl = slot.labelEl.querySelector(".rex-project-label-text");
  if (textEl) textEl.textContent = `${slot.project?.label ?? ""} · ${name}`;
}

// HoverHighlight only re-tints when its target changes, so a part attached
// while the crosshair stays on this body would show untinted where the
// previous part was tinted (and the detached part would keep its tint in the
// cache). Invalidating its last target makes the next update() restore every
// cached material and re-apply the tint to whatever is attached now, so a
// hovered sprite looks the same mid-morph as at rest.
function refreshHoverTint(app) {
  const hh = app?.hoverHighlight;
  if (hh && "_currentBodyID" in hh) hh._currentBodyID = NaN;
}

function pose(pivot, angle, scale) {
  pivot.rotation.set(0, angle, 0);
  pivot.scale.setScalar(scale);
}

function beginTransition(st) {
  const from = st.parts[st.index];
  st.index = (st.index + 1) % st.parts.length;
  return { from, to: st.parts[st.index], elapsed: 0, swapped: false, finished: false };
}

function swap(app, slot, st, tr) {
  tr.swapped = true;
  tr.from.pivot.parent?.remove(tr.from.pivot);
  pose(tr.from.pivot, 0, 1);
  pose(tr.to.pivot, -QUARTER_TURN, SWAP_SCALE);
  tr.to.pivot.traverse((o) => { o.bodyID = slot.bodyID; });
  st.stage.add(tr.to.pivot);
  app?._rebuildGrabbables?.();
  refreshHoverTint(app);
  setLabel(slot, tr.to.name);
}

// Advance one tick. Returns true once the transition has finished.
function stepTransition(app, slot, st, tr, dtMs) {
  tr.elapsed += dtMs;
  const t = clamp01(tr.elapsed / DURATION_MS);
  if (t < SWAP_AT) {
    const u = easeInCubic(t / SWAP_AT);
    pose(tr.from.pivot, QUARTER_TURN * u, 1 - (1 - SWAP_SCALE) * u);
    return false;
  }
  if (!tr.swapped) swap(app, slot, st, tr);
  const v = easeOutCubic((t - SWAP_AT) / (1 - SWAP_AT));
  pose(tr.to.pivot, -QUARTER_TURN * (1 - v), SWAP_SCALE + (1 - SWAP_SCALE) * v);
  return t >= 1;
}

// Snap to the end state (normal completion, or cancel on park / reload).
function finishTransition(app, slot, st, tr) {
  if (!tr || tr.finished) return;
  if (!tr.swapped) swap(app, slot, st, tr);
  tr.finished = true;
  pose(tr.to.pivot, 0, 1);
}

export function morph({ app, slot, mesh }) {
  const st = mesh?._morph;
  if (!st || !st.parts || st.parts.length < 2) return { tick() { return false; } };
  if (st.active) {
    // A transition is already running on this mesh: queue one more step.
    st.queued = Math.min(MAX_QUEUE, (st.queued ?? 0) + 1);
    return { tick() { return false; } };
  }

  st.active = true;
  st.queued = 0;
  let tr = beginTransition(st);

  return {
    tick(dtMs) {
      // ProjectSystem.update() passes a fixed per-frame step (like every
      // other tick ability); cap it so a hitch can't skip the transition.
      const dt = Math.min(50, Math.max(0, Number.isFinite(dtMs) ? dtMs : 16));
      if (!stepTransition(app, slot, st, tr, dt)) return true;
      finishTransition(app, slot, st, tr);
      if (st.queued > 0) {
        st.queued -= 1;
        tr = beginTransition(st);
        return true;
      }
      st.active = false;
      return false;
    },
    cancel() {
      finishTransition(app, slot, st, tr);
      st.queued = 0;
      st.active = false;
    },
  };
}
