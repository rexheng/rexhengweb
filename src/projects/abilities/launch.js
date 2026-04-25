// Launch ability — one-shot upward qvel impulse with random tumble.
// Used by the Arrow sprite. Skips the write if the body is currently being
// grabbed (avoids fighting the spring).

export function launch({ app, slot }) {
  const grabber = app.grabber;
  if (grabber?.active && grabber?.bodyID === slot.bodyID) {
    return { tick() { return false; } };
  }

  const model = app.model, data = app.data;
  const jntAdr = model.body_jntadr[slot.bodyID];
  if (jntAdr < 0) return { tick() { return false; } };
  const dofAdr = model.jnt_dofadr[jntAdr];

  // Linear: straight up. Angular: small random pitch + roll, modest yaw.
  data.qvel[dofAdr + 0] = 0;
  data.qvel[dofAdr + 1] = 0;
  data.qvel[dofAdr + 2] = 5.0;                          // upward m/s
  data.qvel[dofAdr + 3] = (Math.random() - 0.5) * 3;    // pitch
  data.qvel[dofAdr + 4] = (Math.random() - 0.5) * 3;    // roll
  data.qvel[dofAdr + 5] = 2.0;                          // yaw spin

  app.mujoco.mj_forward(model, data);
  return { tick() { return false; } };
}
