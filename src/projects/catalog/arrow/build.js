// Arrow — geometric upward arrow inside a transparent glass cube.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const arrowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.arrow),
    emissive: new THREE.Color(COLOURS.arrowEmissive),
    emissiveIntensity: 0.5,
    roughness: 0.35,
    metalness: 0.35,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COLOURS.glass),
    transparent: true,
    opacity: 0.18,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.85,
    thickness: 0.05,
    ior: 1.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const edgeMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(COLOURS.glassEdge),
    transparent: true,
    opacity: 0.65,
  });

  const group = new THREE.Group();
  group.name = "arrow_mesh";

  // Inner arrow shaft.
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(SIZES.shaftRTop, SIZES.shaftRBottom, SIZES.shaftH, 20),
    arrowMat,
  );
  shaft.position.y = SIZES.shaftBaseY + SIZES.shaftH / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);

  // Inner arrow head — square pyramid.
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(SIZES.headRBase, SIZES.headH, 4),
    arrowMat,
  );
  head.position.y = SIZES.shaftBaseY + SIZES.shaftH + SIZES.headH / 2;
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  // Outer glass cube — transparent enclosure.
  const cubeGeom = new THREE.BoxGeometry(SIZES.cubeSize, SIZES.cubeSize, SIZES.cubeSize);
  const cube = new THREE.Mesh(cubeGeom, glassMat);
  cube.position.y = SIZES.cubeBaseY + SIZES.cubeSize / 2;
  cube.castShadow = false;
  cube.receiveShadow = false;
  group.add(cube);

  // Visible edge wireframe on the cube — anchors it visually so it doesn't
  // dissolve into the background.
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(cubeGeom),
    edgeMat,
  );
  edges.position.copy(cube.position);
  group.add(edges);

  return group;
}
