export function setBodyCollision(model, bodyID, { contype, conaffinity }) {
  const geomStart = model.body_geomadr[bodyID];
  const geomCount = model.body_geomnum[bodyID];
  for (let offset = 0; offset < geomCount; offset++) {
    const geomID = geomStart + offset;
    model.geom_contype[geomID] = contype;
    model.geom_conaffinity[geomID] = conaffinity;
  }
}

export function parkSlotBody(model, data, bodyID, parkedZ) {
  const jointID = model.body_jntadr[bodyID];
  if (jointID < 0 || model.jnt_type[jointID] !== 0) return;

  const qposAdr = model.jnt_qposadr[jointID];
  const dofAdr = model.jnt_dofadr[jointID];
  data.qpos[qposAdr + 0] = 0;
  data.qpos[qposAdr + 1] = 0;
  data.qpos[qposAdr + 2] = parkedZ;
  data.qpos[qposAdr + 3] = 1;
  data.qpos[qposAdr + 4] = 0;
  data.qpos[qposAdr + 5] = 0;
  data.qpos[qposAdr + 6] = 0;
  for (let i = 0; i < 6; i++) data.qvel[dofAdr + i] = 0;
}
