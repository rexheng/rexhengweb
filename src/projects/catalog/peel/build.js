// Peel — produce crates + leaf-stamped coin.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const woodMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.crateWood),
    roughness: 0.85,
    metalness: 0.0,
  });
  const coinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.coin),
    emissive: new THREE.Color(COLOURS.coin),
    emissiveIntensity: 0.12,
    roughness: 0.4,
    metalness: 0.6,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.leaf),
    roughness: 0.55,
    metalness: 0.05,
    emissive: new THREE.Color(COLOURS.leaf),
    emissiveIntensity: 0.15,
  });

  const group = new THREE.Group();
  group.name = "peel_mesh";

  // Stack crates.
  let y = SIZES.baseY;
  for (let i = 0; i < SIZES.crateCount; i++) {
    const crate = primitives.produceCrate(THREE, {
      width:  SIZES.crateW,
      depth:  SIZES.crateDepth,
      height: SIZES.crateH,
      slats:  3,
      material: woodMat,
    });
    crate.position.y = y;
    group.add(crate);
    y += SIZES.crateH + SIZES.crateGap;
  }

  // Coin on top of the top crate.
  const coinY = y + SIZES.coinH / 2 + 0.01 * SIZES.crateH;
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(SIZES.coinR, SIZES.coinR, SIZES.coinH, 28),
    coinMat,
  );
  coin.position.y = coinY;
  coin.castShadow = true;
  coin.name = "peel-coin";
  coin.userData.baseY = coinY;
  group.add(coin);

  // Leaf — a stretched sphere on top of the coin.
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(SIZES.leafR, 14, 12),
    leafMat,
  );
  leaf.scale.set(1.2, 0.35, 0.6);
  leaf.rotation.z = -0.4;
  leaf.position.y = coinY + SIZES.coinH / 2 + SIZES.leafYOffset;
  leaf.castShadow = true;
  group.add(leaf);

  return group;
}
