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
 * London Underground roundel — red torus with a horizontal bar across.
 *
 *   { outerR, tubeR, barW, barH, barD, torusMat, barMat, textMat = null }
 *
 * The torus lies in the XY plane (rotated so it faces +Z). The bar is a box
 * extruded through the torus's centre, visibly thicker than the torus so it
 * reads as the canonical London Underground roundel. Returns a Group
 * centred on its own origin.
 */
export function roundel(THREE, { outerR, tubeR, barW, barH, barD, torusMat, barMat, textMat = null }) {
  const group = new THREE.Group();
  group.name = "roundel";

  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(outerR, tubeR, 20, 60),
    torusMat,
  );
  // TorusGeometry's tube revolves around +Z by default; rotate so the ring
  // faces the viewer (+Z axis becomes the torus normal, lying in XY plane).
  torus.castShadow = true;
  torus.receiveShadow = true;
  group.add(torus);

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(barW, barH, barD),
    barMat,
  );
  bar.castShadow = true;
  bar.receiveShadow = true;
  group.add(bar);

  if (textMat) {
    // Small white "text plate" in the centre of the bar — a slab that a
    // caller can position letters on later. For the sprite read, a single
    // white slab at 40%×60% of the bar is enough to trigger the memory of
    // the STATION roundel.
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(barW * 0.42, barH * 0.62, barD * 1.05),
      textMat,
    );
    group.add(plate);
  }

  return group;
}

/**
 * Point on a stadium-track centreline at parameter t ∈ [0, 1).
 *
 *   stadiumTrackPoint({ outerW, outerD }, t) → { x, z }
 *
 * Returns sprite-local (x, z) on the centreline of the oval ring built by
 * `stadiumTrack` (same {outerW, outerD} convention). Lap order: starts at
 * the +X end of the +Z straight, runs −X along the +Z straight, sweeps
 * around the −X half-circle, runs +X along the −Z straight, sweeps around
 * the +X half-circle, and closes the loop. Total path length is normalised
 * so equal Δt steps trace equal arc-length steps.
 */
export function stadiumTrackPoint({ outerW, outerD }, t) {
  const halfDepth = outerD / 2;
  const straightLen = Math.max(0.01, outerW - outerD);
  const arcLen = Math.PI * halfDepth;
  const total = 2 * straightLen + 2 * arcLen;

  const u = ((t % 1) + 1) % 1;     // wrap into [0, 1)
  let s = u * total;

  // Segment 1: +Z straight, +X end → −X end (z = +halfDepth, x: +sl/2 → -sl/2).
  if (s < straightLen) {
    const k = s / straightLen;
    return { x: straightLen / 2 - k * straightLen, z: halfDepth };
  }
  s -= straightLen;
  // Segment 2: −X half-circle, sweeping from +Z side to −Z side (CCW from above).
  if (s < arcLen) {
    const k = s / arcLen;
    const ang = Math.PI / 2 + k * Math.PI;
    return {
      x: -straightLen / 2 + Math.cos(ang) * halfDepth,
      z: Math.sin(ang) * halfDepth,
    };
  }
  s -= arcLen;
  // Segment 3: −Z straight, −X end → +X end (z = -halfDepth, x: -sl/2 → +sl/2).
  if (s < straightLen) {
    const k = s / straightLen;
    return { x: -straightLen / 2 + k * straightLen, z: -halfDepth };
  }
  s -= straightLen;
  // Segment 4: +X half-circle, sweeping from −Z side back to +Z side.
  const k = s / arcLen;
  const ang = -Math.PI / 2 + k * Math.PI;
  return {
    x: straightLen / 2 + Math.cos(ang) * halfDepth,
    z: Math.sin(ang) * halfDepth,
  };
}

/**
 * Stadium track — an oval ring made of two half-circles and two straight
 * sections. Used for the Oliver Wyman running-track sprite.
 *
 *   { outerW, outerD, tubeR, material }
 *
 * Returns a Group. Total X extent = outerW, total Z extent = outerD. The
 * straight sections run along the X axis, the half-circles sit at ±X ends.
 * Y centre = 0, tube thickness = tubeR.
 */
export function stadiumTrack(THREE, { outerW, outerD, tubeR, material }) {
  const group = new THREE.Group();
  group.name = "stadium_track";

  const halfDepth = outerD / 2;                   // radius of the end caps
  const straightLen = Math.max(0.01, outerW - outerD);

  // Two straights — cylinders along X. Length along X axis means rotation
  // of PI/2 around Z so the cylinder's length aligns with X.
  for (const sign of [-1, 1]) {
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(tubeR, tubeR, straightLen, 18, 1, false),
      material,
    );
    cyl.rotation.z = Math.PI / 2;
    cyl.position.set(0, 0, sign * halfDepth);
    cyl.castShadow = true;
    group.add(cyl);
  }

  // Two half-circle caps — half-torus on each X end.
  for (const sign of [-1, 1]) {
    const cap = new THREE.Mesh(
      new THREE.TorusGeometry(halfDepth, tubeR, 14, 28, Math.PI),
      material,
    );
    // Flat on the XZ plane (torus normal = +Y), rotated to open toward the
    // straights (i.e. the half-torus arc opens toward +X on the +X side).
    cap.rotation.x = Math.PI / 2;
    cap.rotation.y = sign === 1 ? -Math.PI / 2 : Math.PI / 2;
    cap.position.set(sign * straightLen / 2, 0, 0);
    cap.castShadow = true;
    group.add(cap);
  }

  return group;
}

/**
 * Plus/cross slab — an NHS plus sign composed of two overlapping boxes.
 *
 *   { armLength, armWidth, armDepth, material }
 *
 * armLength is the tip-to-tip length of each arm; armWidth is the thickness
 * of the arm; armDepth is the extrusion along Z. The cross is centred on
 * origin, lying in the XY plane.
 */
export function crossSlab(THREE, { armLength, armWidth, armDepth, material }) {
  const group = new THREE.Group();
  group.name = "cross_slab";

  const horiz = new THREE.Mesh(
    new THREE.BoxGeometry(armLength, armWidth, armDepth),
    material,
  );
  horiz.castShadow = true;
  horiz.receiveShadow = true;
  group.add(horiz);

  const vert = new THREE.Mesh(
    new THREE.BoxGeometry(armWidth, armLength, armDepth),
    material,
  );
  vert.castShadow = true;
  vert.receiveShadow = true;
  group.add(vert);

  return group;
}

/**
 * Open produce crate — a slatted wooden box. Three slats on each long face,
 * open top. Used for the Peel food-waste marketplace sprite.
 *
 *   { width, depth, height, slats = 3, material }
 *
 * Width = X extent, Depth = Z extent, Height = Y extent. Centred on its own
 * origin at y = height/2 (so the base sits at y=0).
 */
export function produceCrate(THREE, { width, depth, height, slats = 3, material }) {
  const group = new THREE.Group();
  group.name = "produce_crate";

  const slatH = height / (slats * 2 - 1);   // slat + gap + slat + gap + slat
  const slatThickness = width * 0.05;
  const slatGap = slatH;                    // equal to slat height so pattern is even

  // Long-face slats (facing ±Z).
  for (let s = 0; s < slats; s++) {
    const y = slatH / 2 + s * (slatH + slatGap);
    for (const sign of [-1, 1]) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(width, slatH, slatThickness),
        material,
      );
      slat.position.set(0, y, sign * (depth / 2));
      slat.castShadow = true;
      slat.receiveShadow = true;
      group.add(slat);
    }
  }

  // Short-face slats (facing ±X) — narrower, same count.
  for (let s = 0; s < slats; s++) {
    const y = slatH / 2 + s * (slatH + slatGap);
    for (const sign of [-1, 1]) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(slatThickness, slatH, depth),
        material,
      );
      slat.position.set(sign * (width / 2), y, 0);
      slat.castShadow = true;
      slat.receiveShadow = true;
      group.add(slat);
    }
  }

  // Thin solid base.
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, slatThickness, depth),
    material,
  );
  base.position.y = slatThickness / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  return group;
}

/**
 * Plain rectangular building block — used for city skylines.
 *
 *   { width, depth, height, material }
 *
 * Centred on origin at y = height/2 (base at y=0).
 */
export function buildingBlock(THREE, { width, depth, height, material }) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material,
  );
  mesh.position.y = height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Floating 3D music note — a stem + an oblique noteHead.
 *
 *   { noteHeadR, stemLength, stemR, material }
 *
 * The stem points up from (0, 0, 0); the noteHead (a squashed sphere) sits
 * at the base of the stem, tilted slightly for readability.
 */
export function musicNote(THREE, { noteHeadR, stemLength, stemR, material }) {
  const group = new THREE.Group();
  group.name = "music_note";

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(stemR, stemR, stemLength, 12),
    material,
  );
  stem.position.y = stemLength / 2;
  stem.castShadow = true;
  group.add(stem);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(noteHeadR, 20, 16),
    material,
  );
  head.scale.set(1.0, 0.7, 0.6);
  head.rotation.z = -0.3;
  head.position.set(-noteHeadR * 0.25, 0, 0);
  head.castShadow = true;
  group.add(head);

  return group;
}

/**
 * Scroll emblem — a flat cylinder with a slight ribbon. Used for the
 * peter-network Cambridge outfit.
 *
 *   { length, radius, material }
 *
 * length is along X, the cylinder's central axis.
 */
export function scrollEmblem(THREE, { length, radius, material }) {
  const group = new THREE.Group();
  group.name = "scroll_emblem";

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 20),
    material,
  );
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;
  group.add(body);

  // A thin darker ribbon wrapping the scroll mid-length — implement as a
  // second cylinder with slightly larger radius and short length.
  const ribbon = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.08, radius * 1.08, length * 0.18, 20),
    material,
  );
  ribbon.rotation.z = Math.PI / 2;
  ribbon.castShadow = true;
  group.add(ribbon);

  return group;
}

/**
 * Briefcase emblem — box body + handle bar. Simplified from the brief
 * (no latching hardware — the handle alone is enough to read as briefcase
 * at the sprite's pixel size).
 *
 *   { width, height, depth, handleR, material }
 */
export function briefcaseEmblem(THREE, { width, height, depth, handleR, material }) {
  const group = new THREE.Group();
  group.name = "briefcase_emblem";

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material,
  );
  body.castShadow = true;
  group.add(body);

  // Handle — a thin torus arch above the body.
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(width * 0.28, handleR, 8, 20, Math.PI),
    material,
  );
  handle.position.set(0, height / 2 + handleR, 0);
  handle.rotation.x = 0;
  handle.rotation.z = 0;
  handle.castShadow = true;
  group.add(handle);

  return group;
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
