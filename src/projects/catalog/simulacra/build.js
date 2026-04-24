// Simulacra — central glowing hub + 5 persona satellites.
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
  const satBodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.satellite),
    roughness: 0.55,
    metalness: 0.1,
  });
  const satHeadMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.satelliteHead),
    roughness: 0.6,
    metalness: 0.02,
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

    // Capsule body — cylinder + a small head sphere.
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(SIZES.satR, SIZES.satR, SIZES.satHeight, 14),
      satBodyMat,
    );
    body.position.y = 0;
    body.castShadow = true;
    sat.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(SIZES.satR * 1.1, 14, 12),
      satHeadMat,
    );
    head.position.y = SIZES.satHeight / 2 + SIZES.satR * 0.6;
    head.castShadow = true;
    sat.add(head);

    // Place the satellite on the ring. swarm.js reads this position to
    // compute its initial angle + radius.
    sat.position.set(
      Math.cos(a) * SIZES.satRingR,
      SIZES.hubY,
      Math.sin(a) * SIZES.satRingR,
    );
    group.add(sat);
  }

  return group;
}
