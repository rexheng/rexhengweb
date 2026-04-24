// Olympic Way — Underground roundel on a plinth.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS, D } = proportions;

  const torusMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.torus),
    roughness: 0.45,
    metalness: 0.15,
  });
  const barMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.bar),
    roughness: 0.5,
    metalness: 0.1,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.plate),
    roughness: 0.6,
    metalness: 0.0,
  });
  const plinthMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.plinth),
    roughness: 0.8,
    metalness: 0.05,
  });

  const group = new THREE.Group();
  group.name = "olympic_way_mesh";

  // Plinth — sits flat on slot ground.
  const plinthY = SIZES.plinthBaseY + SIZES.plinthH / 2;
  const plinth = primitives.disc(THREE, {
    radius: SIZES.plinthR,
    height: SIZES.plinthH,
    material: plinthMat,
  });
  plinth.position.y = plinthY;
  group.add(plinth);

  // Roundel — torus + bar + plate grouped. Lives on +Z (facing outward)
  // by default; we rotate it so the ring's face looks toward +Z (viewer
  // from the ragdoll playground side).
  const roundelGroup = primitives.roundel(THREE, {
    outerR:   SIZES.roundelOuterR,
    tubeR:    SIZES.roundelTubeR,
    barW:     SIZES.barW,
    barH:     SIZES.barH,
    barD:     SIZES.barD,
    torusMat,
    barMat,
    textMat:  plateMat,
  });
  roundelGroup.position.y = SIZES.roundelY + SIZES.plinthBaseY + SIZES.plinthH + SIZES.roundelOuterR + 0.10 * D;
  group.add(roundelGroup);

  return group;
}
