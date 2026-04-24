// Neo-Riemannian Explorer — piano keyboard sprite.
//
// Composes a short octave keyboard: wooden base + 7 white keys + 5 black
// keys + a small purple brand plate. All dimensions and colours are read
// from proportions.js.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS, WHITE_KEYS, BLACK_KEY_OFFSETS } = proportions;

  // This project's palette doesn't overlap with the default factory keys
  // in materials.forProject, so we build its materials inline from
  // THREE — still no hex literals here, every colour traces to
  // proportions.COLOURS.
  const wood = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.wood),
    roughness: 0.78,
    metalness: 0.05,
  });
  const white = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COLOURS.whiteKey),
    roughness: 0.32,
    metalness: 0.02,
    clearcoat: 0.4,
    clearcoatRoughness: 0.25,
  });
  const black = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COLOURS.blackKey),
    roughness: 0.28,
    metalness: 0.08,
    clearcoat: 0.5,
  });
  const logoMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.logoPlate),
    emissive: new THREE.Color(COLOURS.logoPlate),
    emissiveIntensity: 0.35,
    roughness: 0.4,
    metalness: 0.2,
  });

  const group = new THREE.Group();
  group.name = "neo_riemannian_mesh";

  // ── Wooden base. ───────────────────────────────────────────────────────
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.baseWidth, SIZES.baseHeight, SIZES.baseDepth),
    wood,
  );
  base.position.y = SIZES.baseY + SIZES.baseHeight / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // ── White keys. ────────────────────────────────────────────────────────
  const keyRowY = SIZES.baseY + SIZES.baseHeight + SIZES.whiteKeyHeight / 2;
  const octaveWidth = WHITE_KEYS * SIZES.whiteKeyWidth + (WHITE_KEYS - 1) * SIZES.whiteKeyGap;
  const xStart = -octaveWidth / 2 + SIZES.whiteKeyWidth / 2;
  for (let i = 0; i < WHITE_KEYS; i++) {
    const key = new THREE.Mesh(
      new THREE.BoxGeometry(
        SIZES.whiteKeyWidth,
        SIZES.whiteKeyHeight,
        SIZES.whiteKeyDepth,
      ),
      white,
    );
    key.position.x = xStart + i * (SIZES.whiteKeyWidth + SIZES.whiteKeyGap);
    key.position.y = keyRowY;
    key.position.z = 0;
    key.castShadow = true;
    key.receiveShadow = true;
    group.add(key);
  }

  // ── Black keys. ────────────────────────────────────────────────────────
  const blackKeyY = SIZES.baseY + SIZES.baseHeight + SIZES.blackKeyHeight / 2;
  for (const offset of BLACK_KEY_OFFSETS) {
    const key = new THREE.Mesh(
      new THREE.BoxGeometry(
        SIZES.blackKeyWidth,
        SIZES.blackKeyHeight,
        SIZES.blackKeyDepth,
      ),
      black,
    );
    key.position.x = xStart + offset * (SIZES.whiteKeyWidth + SIZES.whiteKeyGap);
    key.position.y = blackKeyY;
    key.position.z = -SIZES.blackKeyZOffset; // set back from the front edge
    key.castShadow = true;
    group.add(key);
  }

  // ── Logo plate at the back of the base. ────────────────────────────────
  const logo = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.logoWidth, SIZES.logoHeight, SIZES.logoDepth),
    logoMat,
  );
  logo.position.set(
    -SIZES.baseWidth / 2 + SIZES.logoWidth,
    SIZES.baseY + SIZES.baseHeight + SIZES.logoHeight / 2,
    -SIZES.baseDepth / 2 - SIZES.logoDepth / 2,
  );
  group.add(logo);

  return group;
}
