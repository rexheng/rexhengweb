// Arrow — geometric upward arrow with a glow.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.arrow),
    emissive: new THREE.Color(COLOURS.arrowEmissive),
    emissiveIntensity: 0.4,
    roughness: 0.35,
    metalness: 0.35,
  });

  const group = new THREE.Group();
  group.name = "arrow_mesh";

  // Shaft — slightly tapered cylinder (bottom narrower, top slightly wider).
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(SIZES.shaftRTop, SIZES.shaftRBottom, SIZES.shaftH, 20),
    mat,
  );
  shaft.position.y = SIZES.shaftBaseY + SIZES.shaftH / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);

  // Head — cone/pyramid on top of the shaft.
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(SIZES.headRBase, SIZES.headH, 4),
    mat,
  );
  head.position.y = SIZES.shaftBaseY + SIZES.shaftH + SIZES.headH / 2;
  // Rotate so the pyramid's square base sits flat on the shaft (default
  // ConeGeometry orientation already puts apex up with 4 radial segments).
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  return group;
}
