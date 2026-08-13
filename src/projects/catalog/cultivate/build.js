// Cultivate — QR plate + four meeting-graph nodes on a ring.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const plateMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.plate),
    roughness: 0.55,
    metalness: 0.08,
  });
  const cellMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.cell),
    roughness: 0.4,
    metalness: 0.05,
  });
  const nodeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.node),
    emissive: new THREE.Color(COLOURS.node),
    emissiveIntensity: 0.4,
    roughness: 0.35,
    metalness: 0.15,
  });

  const group = new THREE.Group();
  group.name = "cultivate_mesh";

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.plateW, SIZES.plateH, SIZES.plateD),
    plateMat,
  );
  plate.position.y = SIZES.plateBaseY + SIZES.plateH / 2;
  plate.castShadow = true;
  plate.receiveShadow = true;
  group.add(plate);

  const pitch = SIZES.cell + SIZES.cellGap;
  const origin = -pitch;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (row === 1 && col === 1) continue;
      const cubie = new THREE.Mesh(
        new THREE.BoxGeometry(SIZES.cell, SIZES.cell, SIZES.cellD),
        cellMat,
      );
      cubie.position.set(
        origin + col * pitch,
        plate.position.y + origin + row * pitch,
        SIZES.plateD / 2 + SIZES.cellD / 2,
      );
      cubie.castShadow = true;
      group.add(cubie);
    }
  }

  const N = SIZES.nodeCount;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.PI / 4;
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(SIZES.nodeR, 16, 12),
      nodeMat,
    );
    node.position.set(
      Math.cos(a) * SIZES.nodeRingR,
      plate.position.y,
      Math.sin(a) * SIZES.nodeRingR,
    );
    node.castShadow = true;
    group.add(node);
  }

  return group;
}
