// Lawsuit Peter — Peter avatar with scales-of-justice emblem.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS, D } = proportions;

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COLOURS.body),
    roughness: 0.55, metalness: 0.1, clearcoat: 0.3,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.headSkin),
    roughness: 0.6, metalness: 0.02,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.accentTrim),
    roughness: 0.7, metalness: 0.1,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.brass),
    emissive: new THREE.Color(COLOURS.brassDark),
    emissiveIntensity: 0.1,
    roughness: 0.35, metalness: 0.7,
  });
  const brassDark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.brassDark),
    roughness: 0.45, metalness: 0.6,
  });

  const emblemBuilder = (THREE_, { headTopY }) => {
    const g = new THREE_.Group();
    const yBase = headTopY + SIZES.emblemLift;

    // Central vertical post.
    const post = new THREE_.Mesh(
      new THREE_.CylinderGeometry(SIZES.postR, SIZES.postR, SIZES.postLen, 16),
      brass,
    );
    post.position.y = yBase + SIZES.postLen / 2;
    g.add(post);

    // Cross beam near the top of the post.
    const beamY = yBase + SIZES.postLen * 0.85;
    const beam = new THREE_.Mesh(
      new THREE_.BoxGeometry(SIZES.beamW, SIZES.beamH, SIZES.beamD),
      brass,
    );
    beam.position.y = beamY;
    g.add(beam);

    // Pans on each side.
    for (const sign of [-1, 1]) {
      const chain = new THREE_.Mesh(
        new THREE_.CylinderGeometry(SIZES.chainR, SIZES.chainR, SIZES.chainLen, 12),
        brassDark,
      );
      chain.position.set(sign * (SIZES.beamW / 2 - 0.02 * D), beamY - SIZES.chainLen / 2, 0);
      g.add(chain);

      const pan = new THREE_.Mesh(
        new THREE_.CylinderGeometry(SIZES.panR, SIZES.panR * 0.85, SIZES.panH, 32, 1, false),
        brass,
      );
      pan.position.set(sign * (SIZES.beamW / 2 - 0.02 * D), beamY - SIZES.chainLen - SIZES.panH / 2, 0);
      g.add(pan);
    }
    return g;
  };

  return primitives.peterAvatar(THREE, { bodyMat, headMat, accentMat, emblemBuilder, D });
}
