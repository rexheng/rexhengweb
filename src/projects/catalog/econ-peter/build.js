// Econ Peter — Peter avatar with 3-bar chart emblem.

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
  const barMats = [
    new THREE.MeshStandardMaterial({ color: new THREE.Color(COLOURS.bar1), roughness: 0.5, metalness: 0.2 }),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(COLOURS.bar2), roughness: 0.5, metalness: 0.2 }),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(COLOURS.bar3), roughness: 0.5, metalness: 0.2 }),
  ];

  const emblemBuilder = (THREE_, { headTopY }) => {
    const g = new THREE_.Group();
    const yBase = headTopY + SIZES.emblemLift;
    const totalW = 3 * SIZES.barW + 2 * SIZES.barGap;
    const xStart = -totalW / 2 + SIZES.barW / 2;
    for (let i = 0; i < 3; i++) {
      const h = SIZES.barHs[i];
      const bar = new THREE_.Mesh(
        new THREE_.BoxGeometry(SIZES.barW, h, SIZES.barD),
        barMats[i],
      );
      bar.position.set(
        xStart + i * (SIZES.barW + SIZES.barGap),
        yBase + h / 2,
        0,
      );
      bar.castShadow = true;
      g.add(bar);
    }
    return g;
  };

  return primitives.peterAvatar(THREE, { bodyMat, headMat, accentMat, emblemBuilder, D });
}
