// Heatmap ability — Outreach's 16 LSOA tiles ride a radial wave for ~2s,
// then snap back to rest. Each tile's offset is a function of its
// normalised distance from the grid centre, producing a wave that travels
// outward from the centre.

const DURATION_MS = 2000;
const AMPLITUDE = 0.04;     // metres — peak vertical excursion

export function heatmap({ mesh }) {
  if (!mesh) return { tick() { return false; } };

  // Collect tile children + their resting y. Builder names them
  // `lsoa-tile-<i>` and stashes baseY in userData.
  const tiles = [];
  let cx = 0, cz = 0;
  mesh.traverse((o) => {
    if (typeof o.name === "string" && o.name.startsWith("lsoa-tile")) {
      const baseY = o.userData?.baseY ?? o.position.y;
      tiles.push({ obj: o, baseY, x: o.position.x, z: o.position.z });
      cx += o.position.x;
      cz += o.position.z;
    }
  });
  if (tiles.length === 0) return { tick() { return false; } };
  cx /= tiles.length;
  cz /= tiles.length;

  // Normalise distance-from-centre per tile.
  let maxD = 0;
  for (const t of tiles) {
    t.d = Math.hypot(t.x - cx, t.z - cz);
    if (t.d > maxD) maxD = t.d;
  }
  const dInv = maxD > 1e-6 ? 1 / maxD : 0;
  for (const t of tiles) t.dN = t.d * dInv;

  let elapsed = 0;
  let disposed = false;

  function restore() {
    if (disposed) return;
    disposed = true;
    for (const t of tiles) t.obj.position.y = t.baseY;
  }

  return {
    tick(dtMs) {
      if (disposed) return false;
      elapsed += dtMs;
      const t = Math.min(1, elapsed / DURATION_MS);

      // Travelling wave: each tile's phase = 2π·(t − dN). Multiply by an
      // envelope so the wave fades out instead of stopping abruptly.
      const envelope = Math.sin(Math.PI * t);  // 0 → 1 → 0 over [0, 1]
      for (const tile of tiles) {
        const phase = 2 * Math.PI * (t - tile.dN);
        const offset = AMPLITUDE * tile.dN * Math.sin(phase) * envelope;
        tile.obj.position.y = tile.baseY + offset;
      }

      if (elapsed >= DURATION_MS) {
        restore();
        return false;
      }
      return true;
    },
    cancel() { restore(); },
  };
}
