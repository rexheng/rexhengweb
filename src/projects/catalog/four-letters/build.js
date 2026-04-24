// Four Letters — 4×4 letter tile grid sprite.
//
// Composes a dark base plate with 16 tile cubes in a grid. The first row
// spells "REX ". Remaining tiles are blank (no letter plate) so the
// silhouette still reads as a word-search grid, not a branded novelty.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS, GRID, LETTERS } = proportions;

  // Tile materials use a two-colour approach: cream top face, orange
  // sides. THREE.BoxGeometry takes a material-array per face in the
  // order [+x, -x, +y, -y, +z, -z].
  const topMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COLOURS.tileFace),
    roughness: 0.45,
    metalness: 0.02,
    clearcoat: 0.2,
  });
  const sideMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.tileSide),
    roughness: 0.6,
    metalness: 0.05,
  });
  const tileMats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
  const baseMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.gridBase),
    roughness: 0.85,
    metalness: 0.1,
  });
  const letterMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.letterFace),
    roughness: 0.4,
    metalness: 0.0,
  });

  const group = new THREE.Group();
  group.name = "four_letters_mesh";

  // ── Dark base plate. ───────────────────────────────────────────────────
  const gridSide = GRID * SIZES.tileSize + (GRID - 1) * SIZES.tileGap;
  const baseSide = gridSide + 2 * SIZES.basePadding;
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(baseSide, SIZES.baseHeight, baseSide),
    baseMat,
  );
  base.position.y = SIZES.baseY + SIZES.baseHeight / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // ── Tiles. ─────────────────────────────────────────────────────────────
  const tileY = SIZES.baseY + SIZES.baseHeight + SIZES.tileHeight / 2;
  const gridStart = -gridSide / 2 + SIZES.tileSize / 2;
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(SIZES.tileSize, SIZES.tileHeight, SIZES.tileSize),
        tileMats,
      );
      tile.position.set(
        gridStart + col * (SIZES.tileSize + SIZES.tileGap),
        tileY,
        gridStart + row * (SIZES.tileSize + SIZES.tileGap),
      );
      tile.castShadow = true;
      tile.receiveShadow = true;
      group.add(tile);

      const letter = LETTERS[row * GRID + col];
      if (letter) {
        // Thin slab on the top face, slightly inset, carrying the letter
        // shape as a square marker. (THREE has no built-in text without
        // a font asset; we stand in with a slab the letter-foot size.)
        const plate = new THREE.Mesh(
          new THREE.BoxGeometry(SIZES.letterSize, SIZES.letterHeight, SIZES.letterSize),
          letterMat,
        );
        plate.position.set(
          tile.position.x,
          tile.position.y + SIZES.tileHeight / 2 + SIZES.letterHeight / 2,
          tile.position.z,
        );
        // Cheat: carve the plate into a vague letter shape by scaling per
        // letter. "R" ≈ wider; "E" ≈ narrower; "X" ≈ diamond. Not a
        // real font — but the three different footprints read as "this
        // tile has a letter on it, not blank".
        if (letter === "R") plate.scale.set(0.95, 1, 0.75);
        else if (letter === "E") plate.scale.set(0.75, 1, 0.9);
        else if (letter === "X") {
          plate.scale.set(0.8, 1, 0.8);
          plate.rotation.y = Math.PI / 4;
        }
        group.add(plate);
      }
    }
  }

  return group;
}
