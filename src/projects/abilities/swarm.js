// Swarm ability — tick-based, ~3 seconds.
//
// The simulacra sprite is a central hub sphere surrounded by 5 satellite
// humanoid-marker capsules arranged on a ring. `swarm` rotates those
// satellites around the hub for the duration.
//
// The builder (simulacra/build.js) names the satellite children
// `simulacra_satellite` so this ability can find them without depending on
// child ordering or layout details. It captures each satellite's initial
// polar angle on the first tick and advances by ω·dt per tick thereafter.
//
// If the caller doesn't pass a `mesh` (legacy systems that haven't landed
// the context extension), we degrade to a no-op.

const DURATION_MS = 3000;
const ANGULAR_SPEED = 1.6; // rad/s — roughly one turn every 4s

export function swarm({ mesh }) {
  if (!mesh) return { tick() { return false; } };

  // Gather satellites + their initial polar positions relative to the hub.
  const sats = [];
  mesh.traverse((o) => {
    if (o.name === "simulacra_satellite") {
      const r = Math.hypot(o.position.x, o.position.z);
      const a = Math.atan2(o.position.z, o.position.x);
      sats.push({ obj: o, r, a0: a });
    }
  });

  if (sats.length === 0) return { tick() { return false; } };

  let elapsed = 0;

  return {
    tick(dtMs) {
      elapsed += dtMs;
      const t = elapsed / 1000; // seconds since start
      const angOffset = ANGULAR_SPEED * t;
      for (const s of sats) {
        const a = s.a0 + angOffset;
        s.obj.position.x = Math.cos(a) * s.r;
        s.obj.position.z = Math.sin(a) * s.r;
      }
      if (elapsed >= DURATION_MS) {
        // Leave satellites at their final orbit position — no cleanup.
        return false;
      }
      return true;
    },
  };
}
