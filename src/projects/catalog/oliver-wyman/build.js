// Oliver Wyman — extruded brand mark + backing plate + pedestal.
// See spec §3.7.

function buildOWLogoShape(THREE) {
  // Hand-traced approximation of the OW mark — two stylised "V" forms
  // meeting at a centre point. Refine if visual QA flags it; spec only
  // requires "reads as the OW mark from 3m away".
  const s = new THREE.Shape();
  s.moveTo(-0.50,  0.30);
  s.lineTo(-0.20, -0.30);
  s.lineTo( 0.00,  0.05);
  s.lineTo( 0.20, -0.30);
  s.lineTo( 0.50,  0.30);
  s.lineTo( 0.30,  0.30);
  s.lineTo( 0.10, -0.05);
  s.lineTo(-0.10, -0.05);
  s.lineTo(-0.30,  0.30);
  s.closePath();
  return s;
}

export function buildMesh({ THREE, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const logoMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.logo),
    roughness: 0.45, metalness: 0.2,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.plate),
    roughness: 0.7, metalness: 0.05,
  });
  const pedMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.pedestal),
    roughness: 0.8, metalness: 0.1,
  });

  const group = new THREE.Group();
  group.name = "oliver_wyman_mesh";

  // Pedestal (base).
  const pedY = SIZES.pedestalBaseY + SIZES.pedestalH / 2;
  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(SIZES.pedestalR, SIZES.pedestalR, SIZES.pedestalH, 40),
    pedMat,
  );
  ped.position.y = pedY;
  ped.castShadow = true; ped.receiveShadow = true;
  group.add(ped);

  // Backing plate, sitting on the pedestal. Centred upright so its xy
  // plane faces +Z.
  const plateBaseY = SIZES.pedestalBaseY + SIZES.pedestalH;
  const plateCentreY = plateBaseY + SIZES.plateH / 2;
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.plateW, SIZES.plateH, SIZES.plateD),
    plateMat,
  );
  plate.position.y = plateCentreY;
  plate.castShadow = true; plate.receiveShadow = true;
  group.add(plate);

  // Extruded logo, in front of the plate. Shape lives in the X/Y plane
  // (per the helper), extruded along +Z. We orient it so the extrude
  // axis points +Z (toward the viewer) and translate it just proud of
  // the plate's front face.
  const shape = buildOWLogoShape(THREE);
  const logoGeom = new THREE.ExtrudeGeometry(shape, {
    depth: SIZES.logoExtrude,
    bevelEnabled: false,
  });
  // Scale the unit-ish shape down to fit the plate. Shape spans roughly
  // x:-0.5..0.5, y:-0.3..0.3 — scale to fit ~80% of plate width.
  const targetW = SIZES.plateW * 0.8;
  const k = targetW / 1.0;       // shape width is 1.0 in the helper
  const logo = new THREE.Mesh(logoGeom, logoMat);
  logo.scale.setScalar(k);
  logo.position.set(0, plateCentreY, SIZES.plateD / 2 + 0.001);
  logo.castShadow = true;
  group.add(logo);

  return group;
}
