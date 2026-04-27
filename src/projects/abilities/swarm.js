// Swarm ability — tick-based, ~3 seconds.
//
// The simulacra sprite is a central hub sphere surrounded by 5 low-poly bee
// satellites arranged on a ring. `swarm` sends those bees through buzzy
// figure-eight paths around the hub for the duration.
//
// The builder (simulacra/build.js) names the satellite children
// `simulacra_satellite` so this ability can find them without depending on
// child ordering or layout details. It stores each satellite's base ring
// position once, computes every buzz from that base, and restores the base
// ring when the ability finishes or is cancelled.
//
// If the caller doesn't pass a `mesh` (legacy systems that haven't landed
// the context extension), we degrade to a no-op.

const DURATION_MS = 3000;
const ANGULAR_SPEED = 1.75; // rad/s — roughly one turn every 3.6s
const FIGURE_EIGHT_SPEED = 7.2;
const TANGENT_SWAY = 0.28;
const RADIAL_SWAY = 0.18;
const VERTICAL_BUZZ = 0.08;

export function swarm({ mesh }) {
  if (!mesh) {
    return {
      tick() { return false; },
      cancel() {},
    };
  }

  // Gather satellites + their immutable base polar positions relative to the hub.
  const sats = [];
  mesh.traverse((o) => {
    if (o.name === "simulacra_satellite") {
      o.userData ??= {};
      if (!o.userData.swarmBase) {
        const x = o.position.x;
        const y = o.position.y;
        const z = o.position.z;
        o.userData.swarmBase = {
          x,
          y,
          z,
          rotationY: o.rotation.y,
          rotationZ: o.rotation.z,
          r: Math.hypot(x, z),
          a0: Math.atan2(z, x),
        };
      }
      sats.push({ obj: o, base: o.userData.swarmBase });
    }
  });

  if (sats.length === 0) {
    return {
      tick() { return false; },
      cancel() {},
    };
  }

  let elapsed = 0;

  function restoreBase() {
    for (const { obj, base } of sats) {
      obj.position.x = base.x;
      obj.position.y = base.y;
      obj.position.z = base.z;
      obj.rotation.y = base.rotationY;
      obj.rotation.z = base.rotationZ;
    }
  }

  return {
    tick(dtMs) {
      elapsed += dtMs;
      const t = elapsed / 1000; // seconds since start
      for (const s of sats) {
        const phase = s.base.a0 * 1.7;
        const pathT = FIGURE_EIGHT_SPEED * t + phase;
        const a = s.base.a0 + ANGULAR_SPEED * t + Math.sin(pathT * 2.7) * 0.05;
        const radialX = Math.cos(a);
        const radialZ = Math.sin(a);
        const tangentX = -radialZ;
        const tangentZ = radialX;
        const tangentOffset = Math.sin(pathT) * s.base.r * TANGENT_SWAY;
        const radius = s.base.r + Math.sin(pathT * 2) * s.base.r * RADIAL_SWAY;

        s.obj.position.x = radialX * radius + tangentX * tangentOffset;
        s.obj.position.z = radialZ * radius + tangentZ * tangentOffset;
        s.obj.position.y = s.base.y + Math.sin(pathT * 3.1) * s.base.r * VERTICAL_BUZZ;
        s.obj.rotation.y = s.base.rotationY - (a - s.base.a0) + Math.sin(pathT * 2.2) * 0.18;
        s.obj.rotation.z = s.base.rotationZ + Math.sin(pathT * 3.4) * 0.16;
      }
      if (elapsed >= DURATION_MS) {
        restoreBase();
        return false;
      }
      return true;
    },
    cancel() {
      restoreBase();
    },
  };
}
