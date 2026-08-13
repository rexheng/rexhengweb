// Manusman — fanned briefing cards with a dark meeting overlay in front.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const cardMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.card),
    roughness: 0.7,
    metalness: 0.02,
  });
  const ruleMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.cardRule),
    roughness: 0.55,
    metalness: 0.05,
  });
  const overlayMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.overlay),
    roughness: 0.45,
    metalness: 0.12,
  });
  const barMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.bar),
    emissive: new THREE.Color(COLOURS.bar),
    emissiveIntensity: 0.35,
    roughness: 0.4,
    metalness: 0.2,
  });

  const group = new THREE.Group();
  group.name = "manusman_mesh";

  const fans = [
    { x: -SIZES.cardFanX, z: -SIZES.cardFanZ, rotY:  0.18 },
    { x:  0,              z:  0,              rotY:  0 },
    { x:  SIZES.cardFanX, z:  SIZES.cardFanZ, rotY: -0.18 },
  ];

  for (let i = 0; i < fans.length; i++) {
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(SIZES.cardW, SIZES.cardH, SIZES.cardD),
      cardMat,
    );
    const y = SIZES.stackBaseY + SIZES.cardH / 2 + i * SIZES.cardLift;
    card.position.set(fans[i].x, y, fans[i].z);
    card.rotation.y = fans[i].rotY;
    card.castShadow = true;
    card.receiveShadow = true;
    group.add(card);

    const rule = new THREE.Mesh(
      new THREE.BoxGeometry(SIZES.cardW * 0.62, SIZES.cardD, SIZES.cardD * 1.2),
      ruleMat,
    );
    rule.position.set(fans[i].x, y + SIZES.cardH * 0.22, fans[i].z + SIZES.cardD * 0.7);
    rule.rotation.y = fans[i].rotY;
    group.add(rule);
  }

  const overlay = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.overlayW, SIZES.overlayH, SIZES.overlayD),
    overlayMat,
  );
  overlay.position.set(0.12 * SIZES.cardW, SIZES.overlayY, SIZES.overlayZ);
  overlay.castShadow = true;
  group.add(overlay);

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.overlayW, SIZES.barH, SIZES.overlayD * 1.15),
    barMat,
  );
  bar.position.set(
    overlay.position.x,
    SIZES.overlayY + SIZES.overlayH / 2 - SIZES.barH / 2,
    SIZES.overlayZ + 0.01 * SIZES.cardD,
  );
  group.add(bar);

  return group;
}
