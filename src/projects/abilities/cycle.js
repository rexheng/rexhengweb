// Cycle ability — instant, no-tick.
//
// Used by the peter-network sprite to advance through a ring of outfits.
// Each outfit is { id, label, palette, emblem } and is defined statically
// in peter-network/proportions.js under OUTFITS. The state — current index
// — is stored on the mesh group itself (`_cycleState`) so the ability can
// be invoked repeatedly without leaking state between slots.
//
// Each invocation:
//   1. Advances the outfit index.
//   2. Updates the body/accent material `.color` on the peterAvatar parts.
//   3. Disposes the old emblem group, builds and adds a new one.
//   4. Updates the floating label's text + CSS accent to the new outfit.
//   5. Updates `slot.project.accent` + `slot.project.label` so the card
//      sees the new state if the user re-opens it.
//
// The builder (peter-network/build.js) exposes the swappable pieces as
// `mesh._peterParts` — { bodyMat, accentMat, emblemParent, rebuildEmblem }.
// `rebuildEmblem` takes an outfit and returns the new emblem group (the
// ability disposes the old group and adds the new one). Colours are
// overwritten directly on materials; no new materials are allocated.

export function cycle({ slot, mesh }) {
  if (!mesh || !mesh._peterParts) return { tick() { return false; } };
  const parts = mesh._peterParts;
  const { OUTFITS } = parts;
  if (!OUTFITS || !OUTFITS.length) return { tick() { return false; } };

  // Advance index on the mesh (state persists across invocations).
  mesh._cycleIndex = ((mesh._cycleIndex ?? 0) + 1) % OUTFITS.length;
  const outfit = OUTFITS[mesh._cycleIndex];

  // 1. Update body material colours.
  parts.bodyMat.color.set(outfit.palette.body);
  parts.accentMat.color.set(outfit.palette.accent);
  if (parts.headMat && outfit.palette.head) {
    parts.headMat.color.set(outfit.palette.head);
  }

  // 2. Swap emblem — dispose old, attach new.
  const oldEmblem = parts.emblemGroup;
  if (oldEmblem) {
    oldEmblem.parent?.remove(oldEmblem);
    oldEmblem.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material?.dispose?.();
      }
    });
  }
  const newEmblem = parts.rebuildEmblem(outfit);
  parts.emblemParent.add(newEmblem);
  parts.emblemGroup = newEmblem;

  // 3. Update label + card accent.
  if (slot?.labelEl) {
    const textEl = slot.labelEl.querySelector(".rex-project-label-text");
    if (textEl) textEl.textContent = outfit.label;
    slot.labelEl.style.setProperty("--accent", outfit.palette.accent);
  }
  if (slot?.project) {
    slot.project.label = outfit.label;
    slot.project.accent = outfit.palette.accent;
  }

  // Instant — no tick loop needed.
  return { tick() { return false; } };
}
