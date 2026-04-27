// Simulacra — central glowing hub + 5 bee satellites.
//
// Satellite children are named "simulacra_satellite" so the `swarm` ability
// can locate and rotate them by name-search (rather than relying on child
// ordering).

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const hubMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.hub),
    emissive: new THREE.Color(COLOURS.hubEmissive),
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.2,
  });
  const beeBodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.beeBody),
    roughness: 0.5,
    metalness: 0.04,
  });
  const beeStripeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.beeStripe),
    roughness: 0.65,
    metalness: 0.02,
  });
  const beeHeadMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.beeHead),
    roughness: 0.62,
    metalness: 0.02,
  });
  const beeWingMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.beeWing),
    transparent: true,
    opacity: 0.56,
    roughness: 0.2,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  const group = new THREE.Group();
  group.name = "simulacra_mesh";

  // Hub.
  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(SIZES.hubR, 28, 20),
    hubMat,
  );
  hub.position.y = SIZES.hubY;
  hub.castShadow = true;
  hub.receiveShadow = true;
  group.add(hub);

  // Satellites — evenly spaced on a ring in the XZ plane.
  const N = SIZES.satCount;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const sat = new THREE.Group();
    sat.name = "simulacra_satellite"; // key for swarm ability's traverse

    sat.add(primitives.lowPolyBee(THREE, {
      bodyR: SIZES.beeBodyR,
      bodyLength: SIZES.beeBodyLength,
      stripeW: SIZES.beeStripeW,
      wingW: SIZES.beeWingW,
      wingL: SIZES.beeWingL,
      bodyMat: beeBodyMat,
      stripeMat: beeStripeMat,
      headMat: beeHeadMat,
      wingMat: beeWingMat,
    }));

    // Place the satellite on the ring. swarm.js reads this position to
    // compute its initial angle + radius.
    sat.position.set(
      Math.cos(a) * SIZES.satRingR,
      SIZES.hubY,
      Math.sin(a) * SIZES.satRingR,
    );
    sat.rotation.y = -a; // bee faces tangent to its starting orbit path
    group.add(sat);
  }

  return group;
}
