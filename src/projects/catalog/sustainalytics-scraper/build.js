// Sustainalytics Scraper — stacked cardboard boxes with a leaf emblem.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const light = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.cardboardLight),
    roughness: 0.82,
    metalness: 0.02,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.cardboardDark),
    roughness: 0.85,
    metalness: 0.02,
  });
  const tape = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.tape),
    roughness: 0.4,
    metalness: 0.08,
  });
  const leaf = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.leaf),
    emissive: new THREE.Color(COLOURS.leafDark),
    emissiveIntensity: 0.15,
    roughness: 0.55,
    metalness: 0.0,
  });

  const group = new THREE.Group();
  group.name = "sustainalytics_scraper_mesh";

  // Box factory — two-tone (top face darker than sides).
  const makeBox = (w, h, d) => {
    const mats = [light, light, dark, light, light, light];
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    box.castShadow = true;
    box.receiveShadow = true;
    return box;
  };

  // ── Box 1 (bottom). ────────────────────────────────────────────────────
  const box1 = makeBox(SIZES.box1Width, SIZES.box1Height, SIZES.box1Depth);
  box1.position.y = SIZES.baseY + SIZES.box1Height / 2;
  group.add(box1);

  const tape1 = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.box1Width * 1.001, SIZES.tapeHeight, SIZES.box1Depth * 0.25),
    tape,
  );
  tape1.position.set(0, box1.position.y + SIZES.box1Height / 2 - SIZES.tapeHeight / 2, 0);
  group.add(tape1);

  // ── Box 2 (middle, slight nudge). ──────────────────────────────────────
  const box2 = makeBox(SIZES.box2Width, SIZES.box2Height, SIZES.box2Depth);
  box2.position.set(
    SIZES.box2OffsetX,
    SIZES.baseY + SIZES.box1Height + SIZES.box2Height / 2,
    0,
  );
  group.add(box2);

  const tape2 = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.box2Width * 1.001, SIZES.tapeHeight, SIZES.box2Depth * 0.25),
    tape,
  );
  tape2.position.set(
    box2.position.x,
    box2.position.y + SIZES.box2Height / 2 - SIZES.tapeHeight / 2,
    0,
  );
  group.add(tape2);

  // ── Box 3 (top, counter-nudge). ────────────────────────────────────────
  const box3 = makeBox(SIZES.box3Width, SIZES.box3Height, SIZES.box3Depth);
  box3.position.set(
    SIZES.box3OffsetX,
    SIZES.baseY + SIZES.box1Height + SIZES.box2Height + SIZES.box3Height / 2,
    0,
  );
  group.add(box3);

  // ── Leaf emblem — a thin rounded disc on top of box 3. ─────────────────
  const leafMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(SIZES.leafRadius, SIZES.leafRadius, SIZES.leafDepth, 32, 1, false),
    leaf,
  );
  leafMesh.position.set(
    box3.position.x,
    box3.position.y + SIZES.box3Height / 2 + SIZES.leafDepth / 2,
    0,
  );
  // Squish into a leaf oval.
  leafMesh.scale.set(0.9, 1, 1.3);
  group.add(leafMesh);

  return group;
}
