// Literature Peter — Peter avatar with quill + inkwell emblem.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS, D } = proportions;

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COLOURS.body),
    roughness: 0.5, metalness: 0.05, clearcoat: 0.25,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.headSkin),
    roughness: 0.6, metalness: 0.02,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.accentTrim),
    roughness: 0.7, metalness: 0.05,
  });
  const ink = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.inkDark),
    roughness: 0.3, metalness: 0.3,
  });
  const ivory = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.quillIvory),
    roughness: 0.6, metalness: 0.02,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.quillEdge),
    roughness: 0.65,
  });

  const emblemBuilder = (THREE_, { headTopY }) => {
    const g = new THREE_.Group();
    const yBase = headTopY + SIZES.emblemLift;

    // Inkwell sitting on an invisible plane.
    const well = new THREE_.Mesh(
      new THREE_.CylinderGeometry(SIZES.wellR, SIZES.wellR * 1.1, SIZES.wellH, 24),
      ink,
    );
    well.position.set(-0.18 * D, yBase + SIZES.wellH / 2, 0);
    g.add(well);

    // Quill shaft — angled cylinder planted in the well.
    const shaft = new THREE_.Mesh(
      new THREE_.CylinderGeometry(SIZES.shaftR, SIZES.shaftR * 0.6, SIZES.shaftLen, 16),
      ivory,
    );
    const ang = SIZES.shaftAngle;
    shaft.position.set(
      well.position.x + Math.sin(ang) * SIZES.shaftLen * 0.35,
      well.position.y + SIZES.wellH / 2 + Math.cos(ang) * SIZES.shaftLen * 0.35,
      0,
    );
    shaft.rotation.z = -ang;
    g.add(shaft);

    // Feather blade — elongated slab near the top of the shaft.
    const feather = new THREE_.Mesh(
      new THREE_.BoxGeometry(SIZES.featherW, SIZES.featherH, SIZES.featherD),
      edge,
    );
    feather.position.set(
      well.position.x + Math.sin(ang) * SIZES.shaftLen * 0.65,
      well.position.y + SIZES.wellH / 2 + Math.cos(ang) * SIZES.shaftLen * 0.65,
      0,
    );
    feather.rotation.z = -ang;
    g.add(feather);

    return g;
  };

  return primitives.peterAvatar(THREE, { bodyMat, headMat, accentMat, emblemBuilder, D });
}
