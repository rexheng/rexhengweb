// NUS Peter — Peter avatar with mortarboard emblem.

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
  const feltMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.capFelt),
    roughness: 0.9,
  });
  const tasselMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.capTassel),
    emissive: new THREE.Color(COLOURS.capTassel),
    emissiveIntensity: 0.15,
    roughness: 0.4, metalness: 0.3,
  });

  const emblemBuilder = (THREE_, { headTopY }) => {
    const g = new THREE_.Group();
    // Cap body — short cylinder sitting on the head.
    const cap = new THREE_.Mesh(
      new THREE_.CylinderGeometry(SIZES.capR, SIZES.capR, SIZES.capH, 24),
      feltMat,
    );
    cap.position.y = headTopY + SIZES.emblemLift + SIZES.capH / 2;
    g.add(cap);
    // Board — flat square plate on top.
    const board = new THREE_.Mesh(
      new THREE_.BoxGeometry(SIZES.boardW, SIZES.boardH, SIZES.boardW),
      feltMat,
    );
    board.position.y = cap.position.y + SIZES.capH / 2 + SIZES.boardH / 2;
    g.add(board);
    // Tassel — thin cylinder dangling from one corner.
    const tassel = new THREE_.Mesh(
      new THREE_.CylinderGeometry(SIZES.tasselR, SIZES.tasselR, SIZES.tasselLen, 12),
      tasselMat,
    );
    tassel.position.set(
      SIZES.boardW * 0.35,
      board.position.y - SIZES.tasselLen / 2,
      SIZES.boardW * 0.35,
    );
    g.add(tassel);
    return g;
  };

  return primitives.peterAvatar(THREE, { bodyMat, headMat, accentMat, emblemBuilder, D });
}
