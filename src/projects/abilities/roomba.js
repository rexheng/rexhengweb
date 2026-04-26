// Roomba ability — Oliver Wyman sprite skids around the playground floor
// for 2.5s, changing heading every ~400ms. See spec §3.7a.

const DURATION_MS = 2500;
const HEADING_CHANGE_MS = 400;
const SPEED = 1.5;            // m/s in MJ x/y plane
const SKID_BUMP = 0.4;        // upward kick (MJ z) on each heading change
const TURN_LERP = 0.15;       // currentHeading lerp per tick

export function roomba({ app, slot }) {
  const model = app.model, data = app.data;
  if (!model || !data) return { tick() { return false; } };

  const jntAdr = model.body_jntadr[slot.bodyID];
  if (jntAdr < 0 || model.jnt_type[jntAdr] !== 0) {
    // Not a freejoint body — bail.
    return { tick() { return false; } };
  }
  const dofAdr = model.jnt_dofadr[jntAdr];

  let currentHeading = Math.random() * Math.PI * 2;
  let targetHeading = Math.random() * Math.PI * 2;
  let elapsed = 0;
  let lastChangeAtMs = -HEADING_CHANGE_MS;     // forces an initial bump

  return {
    tick(dtMs) {
      elapsed += dtMs;
      if (elapsed >= DURATION_MS) return false;

      // Don't fight the grab spring.
      if (app.grabber?.active && app.grabber?.bodyID === slot.bodyID) {
        return true;
      }

      const dtSec = Math.max(0.0001, dtMs / 1000);
      const prevHeading = currentHeading;

      // Heading change.
      if (elapsed - lastChangeAtMs > HEADING_CHANGE_MS) {
        targetHeading = Math.random() * Math.PI * 2;
        lastChangeAtMs = elapsed;
        // Skid bump.
        data.qvel[dofAdr + 2] = SKID_BUMP;
      }

      // Smooth turn toward target.
      // Pick the shorter angular delta so we don't loop the long way.
      let delta = targetHeading - currentHeading;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      currentHeading += delta * TURN_LERP;

      // Linear x/y velocity.
      data.qvel[dofAdr + 0] = Math.cos(currentHeading) * SPEED;
      data.qvel[dofAdr + 1] = Math.sin(currentHeading) * SPEED;
      // Angular yaw matches the turn rate (MJ z is up — angular DOF index 5).
      data.qvel[dofAdr + 5] = (currentHeading - prevHeading) / dtSec;

      return true;
    },
    cancel() {
      // Optional: zero the linear velocity on cancel so the sprite stops
      // sliding when the ability ends mid-flight.
      try {
        data.qvel[dofAdr + 0] = 0;
        data.qvel[dofAdr + 1] = 0;
      } catch (_) {}
    },
  };
}
