// Chord ability — the Musicity note bobs up and down while its emissive
// intensity oscillates. Restores the original y + emissive on terminal frame.

const DURATION_MS = 2500;
const BOB_AMPLITUDE = 0.30;
const BOB_HZ = 2.0;       // bob cycles per second
const EMI_HZ = 3.0;       // emissive cycles per second

export function chord({ mesh }) {
  if (!mesh) return { tick() { return false; } };

  let note = null;
  mesh.traverse((o) => { if (o.name === "musicity-note") note = o; });
  if (!note) return { tick() { return false; } };

  const baseY = note.userData.baseY ?? note.position.y;
  // Discover the note's material — userData.material if the builder stashed
  // it, otherwise walk the children.
  let mat = note.userData.material;
  if (!mat) {
    note.traverse((o) => { if (o.isMesh && !mat) mat = o.material; });
  }
  const baseEmissive = mat?.emissiveIntensity ?? 0.5;

  let elapsed = 0;
  let disposed = false;

  function restore() {
    if (disposed) return;
    disposed = true;
    if (note) note.position.y = baseY;
    if (mat) mat.emissiveIntensity = baseEmissive;
  }

  return {
    tick(dtMs) {
      if (disposed) return false;
      elapsed += dtMs;
      const t = elapsed / 1000;
      note.position.y = baseY + BOB_AMPLITUDE * Math.sin(2 * Math.PI * BOB_HZ * t);
      if (mat) mat.emissiveIntensity = 0.4 + 0.4 * Math.sin(2 * Math.PI * EMI_HZ * t);

      if (elapsed >= DURATION_MS) {
        restore();
        return false;
      }
      return true;
    },
    cancel() { restore(); },
  };
}
