// Spin ability — visual-only spin-up of the World Labs globe.
//
// The idle onSpawn tick (catalog/world-labs/index.js) owns the globe's
// rotation and adds `rig.spinBoost` (rad/s) to its slow base rate. This
// ability only drives that boost: a fast smoothstep ramp up to PEAK, then
// a cubic ease-out back to 0 so the globe settles seamlessly into its idle
// turn. The physics body is never touched.
//
// Re-triggering mid-spin supersedes the running spin (it starts its ramp
// from the current boost, so there is no jump). Clearing the slot calls
// cancel(), which zeroes the boost.

const RAMP_MS = 220;
const TOTAL_MS = 2000;
const PEAK_RAD_PER_S = 20;

export function spin({ mesh }) {
  const rig = mesh?.userData?.worldLabs;
  if (!rig) return { tick() { return false; } };

  // Supersede a running spin. Its cancel() zeroes the boost, so restore
  // the current value straight away — otherwise the idle tick would see
  // one frame of 0 before this ramp's first tick.
  const start = rig.spinBoost || 0;
  rig.spinHandle?.cancel();
  rig.spinBoost = start;

  let elapsed = 0;
  let done = false;
  const handle = {
    tick(dtMs) {
      if (done) return false;
      elapsed += dtMs;
      if (elapsed < RAMP_MS) {
        const k = elapsed / RAMP_MS;
        const e = k * k * (3 - 2 * k);
        rig.spinBoost = start + (PEAK_RAD_PER_S - start) * e;
        return true;
      }
      const u = (elapsed - RAMP_MS) / (TOTAL_MS - RAMP_MS);
      if (u >= 1) {
        handle.cancel();
        return false;
      }
      const d = 1 - u;
      rig.spinBoost = PEAK_RAD_PER_S * d * d * d;
      return true;
    },
    cancel() {
      if (done) return;
      done = true;
      rig.spinBoost = 0;
      if (rig.spinHandle === handle) rig.spinHandle = null;
    },
  };
  rig.spinHandle = handle;
  return handle;
}
