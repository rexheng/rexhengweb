// Govt Peter — Peter avatar with gavel emblem.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS, D } = proportions;

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COLOURS.body),
    roughness: 0.55, metalness: 0.06, clearcoat: 0.2,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.headSkin),
    roughness: 0.6, metalness: 0.02,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.accentTrim),
    roughness: 0.7, metalness: 0.05,
  });
  const woodLight = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.woodLight),
    roughness: 0.7,
  });
  const woodDark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.woodDark),
    roughness: 0.8,
  });

  const emblemBuilder = (THREE_, { headTopY }) => {
    const g = new THREE_.Group();
    const centreY = headTopY + SIZES.emblemLift + SIZES.headR * 1.5;

    // Gavel head — lying horizontally above the head.
    const gavelHead = new THREE_.Mesh(
      new THREE_.CylinderGeometry(SIZES.headR, SIZES.headR, SIZES.headH, 24),
      woodLight,
    );
    gavelHead.rotation.z = Math.PI / 2;
    gavelHead.position.y = centreY;
    g.add(gavelHead);
    // Dark caps on the ends.
    for (const sign of [-1, 1]) {
      const cap = new THREE_.Mesh(
        new THREE_.CylinderGeometry(SIZES.headR * 1.02, SIZES.headR * 1.02, SIZES.headH * 0.08, 24),
        woodDark,
      );
      cap.rotation.z = Math.PI / 2;
      cap.position.set(sign * SIZES.headH / 2, centreY, 0);
      g.add(cap);
    }
    // Handle — extending forward out of the gavel head underside.
    const handle = new THREE_.Mesh(
      new THREE_.CylinderGeometry(SIZES.handleR, SIZES.handleR, SIZES.handleLen, 16),
      woodLight,
    );
    handle.position.set(0, centreY - SIZES.handleLen / 2 + SIZES.headR * 0.3, 0);
    g.add(handle);
    return g;
  };

  return primitives.peterAvatar(THREE, { bodyMat, headMat, accentMat, emblemBuilder, D });
}
