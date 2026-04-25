// Settle ability — Peel's coin spins around the world-X axis while tracing
// a parabolic arc, then flashes its emissive on landing. Restores rest pose
// on terminal frame.

const DURATION_MS = 1500;
const ARC_HEIGHT = 0.15;
const FLASH_DECAY_MS = 200;

export function settle({ mesh }) {
  if (!mesh) return { tick() { return false; } };

  let coin = null;
  mesh.traverse((o) => { if (o.name === "peel-coin") coin = o; });
  if (!coin) return { tick() { return false; } };

  const baseY = coin.userData.baseY ?? coin.position.y;
  const baseRotX = coin.rotation.x;
  // Find the coin's material (assume single-mesh coin so children[0] not needed).
  const mat = Array.isArray(coin.material) ? coin.material[0] : coin.material;
  const baseEmissive = mat?.emissiveIntensity ?? 0.12;

  let elapsed = 0;
  let landed = false;
  let disposed = false;

  function restore() {
    if (disposed) return;
    disposed = true;
    coin.position.y = baseY;
    coin.rotation.x = baseRotX;
    if (mat) mat.emissiveIntensity = baseEmissive;
  }

  return {
    tick(dtMs) {
      if (disposed) return false;
      elapsed += dtMs;

      if (!landed) {
        const t = Math.min(1, elapsed / DURATION_MS);
        // Parabolic arc, peak at midpoint.
        coin.position.y = baseY + 4 * ARC_HEIGHT * t * (1 - t);
        // Two full revolutions (4π) over DURATION.
        coin.rotation.x = baseRotX + 4 * Math.PI * t;

        if (t >= 1) {
          coin.position.y = baseY;
          coin.rotation.x = baseRotX;
          if (mat) mat.emissiveIntensity = 0.8;
          landed = true;
        }
        return true;
      }

      // Flash decay phase.
      const decayElapsed = elapsed - DURATION_MS;
      if (decayElapsed >= FLASH_DECAY_MS) {
        restore();
        return false;
      }
      const k = decayElapsed / FLASH_DECAY_MS;
      if (mat) mat.emissiveIntensity = 0.8 + (baseEmissive - 0.8) * k;
      return true;
    },
    cancel() { restore(); },
  };
}
