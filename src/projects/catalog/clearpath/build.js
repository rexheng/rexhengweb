// ClearPath — rectangular NHS block with the white "NHS" wordmark on
// front + back faces. The lettering is rendered into a canvas texture so it
// scales cleanly and reads at any camera distance.

function makeNHSTexture(THREE, COLOURS) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // NHS-blue background panel.
  ctx.fillStyle = COLOURS.block;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // White "NHS" wordmark — italic, condensed, hugely heavy. The real NHS
  // logo uses a custom typeface (Frutiger Italic-style); Arial Black Italic
  // is the closest commonly-shipped fallback.
  ctx.fillStyle = COLOURS.letters;
  ctx.font = "italic 900 360px 'Arial Black', 'Helvetica', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Slight horizontal squash to mimic the NHS logo's tighter aspect.
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(0.92, 1.0);
  ctx.fillText("NHS", 0, 8);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace ?? tex.colorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  // Solid blue body for the four side faces.
  const blockMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.block),
    roughness: 0.55,
    metalness: 0.1,
  });
  // Front + back faces use the NHS canvas texture.
  const nhsTex = makeNHSTexture(THREE, COLOURS);
  const faceMat = new THREE.MeshStandardMaterial({
    map: nhsTex,
    roughness: 0.5,
    metalness: 0.1,
  });

  // BoxGeometry material order: [+X, -X, +Y, -Y, +Z, -Z].
  // Plain blue on sides, NHS-textured on +Z and -Z.
  const materialList = [
    blockMat,            // +X
    blockMat,            // -X
    blockMat,            // +Y
    blockMat,            // -Y
    faceMat,             // +Z
    faceMat,             // -Z (texture mirrors fine — NHS reads both ways)
  ];

  const group = new THREE.Group();
  group.name = "clearpath_mesh";

  const block = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.blockW, SIZES.blockH, SIZES.blockD),
    materialList,
  );
  block.position.y = SIZES.blockBaseY + SIZES.blockH / 2;
  block.castShadow = true;
  block.receiveShadow = true;
  group.add(block);

  return group;
}
