// Oliver Wyman — running track + scatterplot trend.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const trackMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.track),
    roughness: 0.5,
    metalness: 0.15,
  });
  const pedMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.pedestal),
    roughness: 0.8,
    metalness: 0.1,
  });
  const dotLowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.dotLow),
    roughness: 0.4,
    metalness: 0.15,
  });
  const dotHighMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.dotHigh),
    roughness: 0.4,
    metalness: 0.15,
  });

  const group = new THREE.Group();
  group.name = "oliver_wyman_mesh";

  // Pedestal.
  const pedY = SIZES.pedestalBaseY + SIZES.pedestalH / 2;
  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(SIZES.pedestalR, SIZES.pedestalR, SIZES.pedestalH, 40),
    pedMat,
  );
  ped.position.y = pedY;
  ped.castShadow = true;
  ped.receiveShadow = true;
  group.add(ped);

  // Track — sits just above the pedestal's top.
  const trackCentreY = SIZES.pedestalBaseY + SIZES.pedestalH + SIZES.trackTubeR + 0.02;
  const track = primitives.stadiumTrack(THREE, {
    outerW: SIZES.trackOuterW,
    outerD: SIZES.trackOuterD,
    tubeR:  SIZES.trackTubeR,
    material: trackMat,
  });
  track.position.y = trackCentreY;
  group.add(track);

  // Scatterplot trend — dots rising from bottom-left to top-right, inside
  // the track. Interpolate X linearly, Z (which reads as "y" from above)
  // with a gentle upward curve.
  const N = SIZES.dotCount;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const x = SIZES.dotXMin + (SIZES.dotXMax - SIZES.dotXMin) * t;
    // Upward trend with slight scatter — zScale curves upward.
    const z = SIZES.dotZMin + (SIZES.dotZMax - SIZES.dotZMin) * Math.pow(t, 0.85);
    const mat = i < N / 2 ? dotLowMat : dotHighMat;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(SIZES.dotR, 12, 10),
      mat,
    );
    dot.position.set(x, trackCentreY, -z);  // negate z so "up" on the chart reads as +Z
    dot.castShadow = true;
    group.add(dot);
  }

  return group;
}
