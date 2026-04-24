// Shared mesh primitive factories.
//
// Every factory is a plain function that takes a `THREE` module reference +
// an options bag and returns a THREE.Mesh or THREE.Group. No module-scope
// THREE import so builders can be used from environments that don't bundle
// three (e.g. a headless Node render harness that passes its own THREE).
//
// See docs/superpowers/specs/2026-04-24-project-sprite-workflow-design.md §3.

/**
 * Flat-bottomed capsule — a cylinder topped with a hemisphere. Used for
 * the Amogus Tic-Tac body (flat bottom instead of egg).
 *
 *   { radius, cylHeight, domeRadius, material, baseY = 0 }
 *
 * baseY is the world-local y coordinate of the flat bottom. domeRadius
 * defaults to radius. The returned Group has its flat base at y=baseY and
 * extends upward by (cylHeight + domeRadius).
 */
export function tictac(THREE, { radius, cylHeight, domeRadius = null, material, baseY = 0, radialSegments = 40 }) {
  const r = radius;
  const rd = domeRadius ?? radius;
  const group = new THREE.Group();
  group.name = "tictac";

  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, cylHeight, radialSegments, 1, false),
    material,
  );
  cyl.position.y = baseY + cylHeight / 2;
  cyl.castShadow = true;
  cyl.receiveShadow = true;
  group.add(cyl);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(rd, radialSegments, Math.max(12, radialSegments >> 1), 0, Math.PI * 2, 0, Math.PI / 2),
    material,
  );
  dome.position.y = baseY + cylHeight;
  dome.castShadow = true;
  dome.receiveShadow = true;
  group.add(dome);

  return group;
}

/**
 * Thin ring sitting on a plane, used as a contact shadow / rim.
 *
 *   { radius, tubeRadius, material, y = 0 }
 */
export function ringBand(THREE, { radius, tubeRadius, material, y = 0, segments = 48 }) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tubeRadius, 16, segments),
    material,
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = y;
  mesh.castShadow = true;
  return mesh;
}

/**
 * Short upright cylinder — used for Amogus's stub legs.
 *
 *   { radius, height, material, baseY = 0, segments = 24 }
 *
 * baseY is the flat-bottom y coordinate.
 */
export function stubLeg(THREE, { radius, height, material, baseY = 0, segments = 24 }) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, segments, 1, false),
    material,
  );
  mesh.position.y = baseY + height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Fluted column (Doric order) — a LatheGeometry whose radial profile has a
 * scalloped ring repeated `flutes` times around the circumference and a
 * smooth entasis curve from bottom to top.
 *
 *   { shaftRBottom, shaftRTop, shaftH, flutes = 20, material }
 *
 * The shaft is drawn as (a) a smooth lathe for the outer envelope, then
 * (b) `flutes` thin vertical half-cylinders cut INTO the shaft. Since THREE
 * LatheGeometry only revolves around a single axis, a true fluted surface
 * would require merging or CSG — so we take the cheap, robust route:
 * model the shaft as a 20-sided lathe and decorate it with thin vertical
 * grooves using `InstancedMesh`-free additive quads.
 *
 * Implementation here uses a LatheGeometry sampled at 20 radial steps,
 * each step a small inward bump — producing a faceted silhouette that
 * reads as fluted at the spec's acceptance distance. Entasis is baked
 * into the radial profile with a cosine curve from rBottom → rTop.
 */
export function flutedColumn(THREE, { shaftRBottom, shaftRTop, shaftH, flutes = 20, material }) {
  const VERT_STEPS = 32;              // vertical samples for entasis
  const FLUTE_DEPTH = 0.04;           // inward bump depth as fraction of radius
  const points = [];
  for (let i = 0; i <= VERT_STEPS; i++) {
    const t = i / VERT_STEPS;
    // Entasis: gentle cosine taper, slight bulge in the lower third.
    const bulge = Math.sin(t * Math.PI) * 0.02;
    const r = (shaftRBottom * (1 - t) + shaftRTop * t) * (1 + bulge);
    const y = t * shaftH;
    points.push(new THREE.Vector2(r, y));
  }
  const geom = new THREE.LatheGeometry(points, flutes * 2);
  // Modulate the radius per vertex in local θ to produce flute grooves.
  // LatheGeometry vertices are laid out as (VERT_STEPS+1) rings × (flutes*2+1) around.
  const pos = geom.attributes.position;
  const segmentsAround = flutes * 2;
  for (let ring = 0; ring <= VERT_STEPS; ring++) {
    for (let s = 0; s <= segmentsAround; s++) {
      const idx = ring * (segmentsAround + 1) + s;
      const x = pos.getX(idx);
      const z = pos.getZ(idx);
      const theta = Math.atan2(z, x);
      // Each flute is a cosine dip over a 2π/flutes arc.
      const dip = FLUTE_DEPTH * (0.5 - 0.5 * Math.cos(theta * flutes));
      // Push inward by (1 - dip).
      const rr = Math.hypot(x, z);
      const k = (rr === 0) ? 0 : (1 - dip);
      pos.setX(idx, x * k);
      pos.setZ(idx, z * k);
    }
  }
  geom.computeVertexNormals();
  const mesh = new THREE.Mesh(geom, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Square abacus slab — the topmost element of a Doric capital.
 *
 *   { width, height, material }
 *
 * Box, castShadow on. Centred on its own origin.
 */
export function abacus(THREE, { width, height, material }) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, width),
    material,
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Flared frustum — used for the echinus between shaft and abacus.
 *
 *   { rBottom, rTop, height, material }
 *
 * CylinderGeometry with top > bottom for the Doric mushroom flare.
 */
export function flaredFrustum(THREE, { rBottom, rTop, height, material, segments = 40 }) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBottom, height, segments, 1, false),
    material,
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Short wide disc — used for the plinth at the very base.
 *
 *   { radius, height, material }
 */
export function disc(THREE, { radius, height, material, segments = 40 }) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, segments, 1, false),
    material,
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * "Peter" avatar — a stylised standing figure for the Instagram Peter
 * network. Six different Peters (LSE, NUS, Govt, Econ, Literature,
 * Lawsuit) share this silhouette: a rounded torso, a spherical head,
 * two stubby arms, and a subject-specific emblem sitting just above the
 * head. Each Peter supplies its own palette + emblem mesh.
 *
 *   {
 *     scale = 1,
 *     bodyMat, headMat, accentMat,
 *     emblemBuilder: (THREE, { material, y, scale }) => Object3D,
 *   }
 *
 * Returns a Group centred on the origin's horizontal plane; the flat
 * bottom of the legs sits at y ≈ -0.5*scale*D. Scale defaults to 1
 * (uses D=0.26 internally through the argument convention — the caller
 * passes the final scale factor so the sprite can fit the slot capsule).
 */
export function peterAvatar(THREE, { bodyMat, headMat, accentMat, emblemBuilder, D = 0.26 }) {
  const group = new THREE.Group();
  group.name = "peter_avatar";

  // Body — a rounded capsule using tictac as the lower/upper torso.
  const torsoR = 0.55 * D;
  const torsoCyl = 0.95 * D;
  const torso = tictac(THREE, {
    radius: torsoR,
    cylHeight: torsoCyl,
    domeRadius: torsoR,
    material: bodyMat,
    baseY: -0.60 * D,
  });
  group.add(torso);

  // Ground rim for contact shadow.
  group.add(
    ringBand(THREE, {
      radius: torsoR,
      tubeRadius: 0.05 * D,
      material: accentMat,
      y: -0.60 * D,
    }),
  );

  // Head — sphere sitting just above the torso dome.
  const headR = 0.35 * D;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(headR, 24, 18),
    headMat,
  );
  head.position.y = -0.60 * D + torsoCyl + torsoR + headR * 0.75;
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  // Two stubby arms — tiny capsules at the torso sides.
  for (const sign of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.SphereGeometry(0.15 * D, 14, 12),
      accentMat,
    );
    arm.scale.set(0.8, 1.5, 0.8);
    arm.position.set(sign * (torsoR + 0.06 * D), -0.60 * D + torsoCyl * 0.55, 0);
    arm.castShadow = true;
    group.add(arm);
  }

  // Emblem — subject-specific, supplied by the caller. Positioned above
  // the head by default; the emblem builder can ignore the y hint.
  if (emblemBuilder) {
    const emblem = emblemBuilder(THREE, {
      headTopY: head.position.y + headR,
      D,
    });
    if (emblem) group.add(emblem);
  }

  return group;
}
