// Musicity — city skyline + floating music note.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const blockMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.block),
    roughness: 0.65,
    metalness: 0.1,
  });
  const noteMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.note),
    emissive: new THREE.Color(COLOURS.noteEmissive),
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.25,
  });

  const group = new THREE.Group();
  group.name = "musicity_mesh";

  // Three blocks — tallest in the middle, others flanking.
  const heights = [SIZES.block3H, SIZES.block1H, SIZES.block2H];
  for (let i = 0; i < 3; i++) {
    const h = heights[i];
    const x = (i - 1) * SIZES.blockSpacing;
    const block = primitives.buildingBlock(THREE, {
      width: SIZES.blockW,
      depth: SIZES.blockDepth,
      height: h,
      material: blockMat,
    });
    block.position.x = x;
    block.position.y = SIZES.blockBaseY + (block.position.y ?? 0); // primitives.buildingBlock sets .y = h/2
    group.add(block);
  }

  // Music note floating above the tallest block (middle, index 1).
  const tallTopY = SIZES.blockBaseY + SIZES.block1H + SIZES.noteFloatY;
  const note = primitives.musicNote(THREE, {
    noteHeadR:  SIZES.noteHeadR,
    stemLength: SIZES.stemLength,
    stemR:      SIZES.stemR,
    material:   noteMat,
  });
  note.position.y = tallTopY;
  note.name = "musicity-note";
  note.userData.baseY = tallTopY;
  note.userData.material = noteMat;
  group.add(note);

  return group;
}
