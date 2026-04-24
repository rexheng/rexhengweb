// ClearPath — NHS cross + clock face.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const crossMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.cross),
    roughness: 0.5,
    metalness: 0.15,
  });
  const clockMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.clock),
    roughness: 0.6,
    metalness: 0.02,
  });
  const tickMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.ticks),
    roughness: 0.7,
    metalness: 0.05,
  });

  const group = new THREE.Group();
  group.name = "clearpath_mesh";

  // Plus/cross slab.
  const cross = primitives.crossSlab(THREE, {
    armLength: SIZES.armLength,
    armWidth:  SIZES.armWidth,
    armDepth:  SIZES.armDepth,
    material:  crossMat,
  });
  cross.position.y = SIZES.crossY;
  group.add(cross);

  // Clock face — sits on top of the centre of the cross.
  const clockY = SIZES.crossY + SIZES.armDepth / 2 + SIZES.clockH / 2;
  const clock = new THREE.Mesh(
    new THREE.CylinderGeometry(SIZES.clockR, SIZES.clockR, SIZES.clockH, 32),
    clockMat,
  );
  clock.position.y = clockY;
  clock.castShadow = true;
  group.add(clock);

  // Twelve tick marks.
  for (let i = 0; i < SIZES.tickCount; i++) {
    const theta = (i / SIZES.tickCount) * Math.PI * 2;
    const x = Math.cos(theta) * SIZES.tickR;
    const z = Math.sin(theta) * SIZES.tickR;
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(SIZES.tickW, SIZES.tickDepth, SIZES.tickH),
      tickMat,
    );
    tick.position.set(x, clockY + SIZES.clockH / 2, z);
    tick.rotation.y = theta; // orient the long axis pointing inward
    group.add(tick);
  }

  return group;
}
