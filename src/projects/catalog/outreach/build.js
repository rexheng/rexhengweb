// Outreach — 4×4 LSOA choropleth tile.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS, hashCell } = proportions;

  const baseMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.base),
    roughness: 0.7,
    metalness: 0.1,
  });
  // Three-stop gradient materials — picked per-cell based on height.
  const matLow = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.subLow),
    roughness: 0.55,
    metalness: 0.1,
  });
  const matMid = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.subMid),
    roughness: 0.5,
    metalness: 0.12,
  });
  const matHigh = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.subHigh),
    roughness: 0.45,
    metalness: 0.15,
    emissive: new THREE.Color(COLOURS.subHigh),
    emissiveIntensity: 0.18,
  });

  const group = new THREE.Group();
  group.name = "outreach_mesh";

  // Base slab.
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.baseW, SIZES.baseH, SIZES.baseDepth),
    baseMat,
  );
  base.position.y = SIZES.baseY + SIZES.baseH / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Sub-tiles — 4×4 grid.
  const topOfBase = SIZES.baseY + SIZES.baseH;
  const N = SIZES.gridN;
  for (let gx = 0; gx < N; gx++) {
    for (let gy = 0; gy < N; gy++) {
      const u = hashCell(gx, gy);
      const h = SIZES.hMin + (SIZES.hMax - SIZES.hMin) * u;
      const x = -SIZES.baseW / 2 + (gx + 0.5) * SIZES.subW;
      const z = -SIZES.baseDepth / 2 + (gy + 0.5) * SIZES.subDepth;
      const mat = u < 0.33 ? matLow : u < 0.66 ? matMid : matHigh;
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(SIZES.subW * 0.92, h, SIZES.subDepth * 0.92),
        mat,
      );
      tile.position.set(x, topOfBase + h / 2, z);
      tile.castShadow = true;
      tile.receiveShadow = true;
      group.add(tile);
    }
  }

  return group;
}
