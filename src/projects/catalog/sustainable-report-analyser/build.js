// Sustainable Report Analyser — folder-with-page sprite.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const cover = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.folderCover),
    roughness: 0.7,
    metalness: 0.05,
  });
  const inside = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.folderInside),
    roughness: 0.8,
    metalness: 0.05,
  });
  const page = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.pageCream),
    roughness: 0.65,
    metalness: 0.0,
  });
  const lines = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.pageLines),
    roughness: 0.6,
    metalness: 0.0,
  });
  const lensRing = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.lensRing),
    roughness: 0.4,
    metalness: 0.35,
  });
  const lensGlass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COLOURS.lensGlass),
    roughness: 0.1,
    transmission: 0.6,
    thickness: 0.3,
    clearcoat: 1,
  });

  const group = new THREE.Group();
  group.name = "sustainable_report_analyser_mesh";

  // ── Folder slab. Two-tone: cover on top, inside on bottom. ─────────────
  const folderMats = [cover, cover, cover, inside, cover, cover];
  const folder = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.folderWidth, SIZES.folderHeight, SIZES.folderDepth),
    folderMats,
  );
  folder.position.y = SIZES.folderBaseY + SIZES.folderHeight / 2;
  folder.castShadow = true;
  folder.receiveShadow = true;
  group.add(folder);

  // ── Page peeking out the back. ─────────────────────────────────────────
  const pageSlab = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.pageWidth, SIZES.pageHeight, SIZES.pageDepth),
    page,
  );
  pageSlab.position.set(
    0,
    SIZES.folderBaseY + SIZES.folderHeight + SIZES.pageHeight / 2,
    SIZES.pageZOffset,
  );
  pageSlab.castShadow = true;
  pageSlab.receiveShadow = true;
  group.add(pageSlab);

  // Text lines on the page.
  const firstLineZ = -SIZES.pageDepth / 2 + 0.15 * proportions.D;
  for (let i = 0; i < SIZES.lineCount; i++) {
    const ln = new THREE.Mesh(
      new THREE.BoxGeometry(SIZES.lineWidth, SIZES.lineHeight, SIZES.lineDepth),
      lines,
    );
    ln.position.set(
      0,
      pageSlab.position.y + SIZES.pageHeight / 2 + SIZES.lineHeight / 2,
      SIZES.pageZOffset + firstLineZ + i * SIZES.linePitch,
    );
    group.add(ln);
  }

  // ── Magnifier on the cover — torus ring + thin handle. ────────────────
  const lensY = folder.position.y + SIZES.folderHeight / 2 + SIZES.lensTubeRadius;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(SIZES.lensRadius, SIZES.lensTubeRadius, 16, 48),
    lensRing,
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(SIZES.lensCentreX, lensY, SIZES.lensCentreZ);
  group.add(ring);

  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(
      SIZES.lensRadius - SIZES.lensTubeRadius * 0.5,
      SIZES.lensRadius - SIZES.lensTubeRadius * 0.5,
      SIZES.lensTubeRadius * 0.8,
      32,
    ),
    lensGlass,
  );
  glass.position.set(SIZES.lensCentreX, lensY, SIZES.lensCentreZ);
  group.add(glass);

  // Handle — a thin cylinder angled outward.
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(SIZES.lensHandleRadius, SIZES.lensHandleRadius, SIZES.lensHandleLength, 16),
    lensRing,
  );
  handle.position.set(
    SIZES.lensCentreX + SIZES.lensRadius * 0.75,
    lensY,
    SIZES.lensCentreZ + SIZES.lensRadius * 0.75,
  );
  handle.rotation.z = Math.PI / 2;
  handle.rotation.y = -Math.PI / 4;
  group.add(handle);

  return group;
}
