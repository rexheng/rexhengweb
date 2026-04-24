// Peter Network — single sprite, six outfits, cycled by the `cycle` ability.
//
// Build strategy:
//   1. Construct the shared peterAvatar with a body material and an accent
//      material that can be mutated in place (cycle swaps only .color).
//   2. Add an `emblemParent` Group to the avatar so the cycle ability can
//      dispose one emblem and attach another without disturbing the body.
//   3. Expose { bodyMat, accentMat, headMat, emblemParent, emblemGroup,
//      rebuildEmblem, OUTFITS } on the mesh as `_peterParts` so
//      abilities/cycle.js can do its work without re-importing the module.
//
// rebuildEmblem(outfit) dispatches on outfit.emblem to build a fresh group
// each time. The ability disposes the previous group + its materials.

import { OUTFITS, EMBLEMS, EMBLEM_COLOURS } from "./proportions.js";

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { D } = proportions;
  const initial = OUTFITS[0];

  // Body + accent + head materials. Colours are set from the initial outfit
  // and mutated by cycle.js thereafter.
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initial.palette.body),
    roughness: 0.55,
    metalness: 0.06,
    clearcoat: 0.22,
    clearcoatRoughness: 0.5,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initial.palette.accent),
    roughness: 0.7,
    metalness: 0.05,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initial.palette.head),
    roughness: 0.6,
    metalness: 0.02,
  });

  // Build a peterAvatar; the emblem is supplied separately and added to
  // `emblemParent` so the cycle ability can swap it without rebuilding the
  // body.
  const emblemParent = new THREE.Group();
  emblemParent.name = "peter_emblem_parent";

  const emblemBuilder = (_THREE, { headTopY }) => {
    // Position the emblemParent above the head; the emblem itself is added
    // via rebuildEmblem below.
    emblemParent.position.y = headTopY;
    return emblemParent;
  };

  // peterAvatar uses its own internal MeshPhysical/MeshStandard materials,
  // which is a problem for cycle — those colours can't be swapped from the
  // outside. Solution: patch the peterAvatar to use our shared materials by
  // building the same silhouette here with bodyMat/accentMat/headMat.
  // Rather than modify the shared primitive, we reconstruct the avatar
  // inline using the same constants as primitives.peterAvatar.
  const avatar = buildPeterBody(THREE, {
    bodyMat, accentMat, headMat,
    D,
  });

  // Attach the emblem parent above the head.
  avatar.add(emblemParent);
  emblemParent.position.y = avatar.userData.headTopY ?? (0.4 * D);

  // Build the first emblem.
  const firstEmblem = buildEmblem(THREE, initial, D);
  emblemParent.add(firstEmblem);

  // Expose parts so the cycle ability can mutate them.
  avatar._peterParts = {
    OUTFITS,
    bodyMat,
    accentMat,
    headMat,
    emblemParent,
    emblemGroup: firstEmblem,
    rebuildEmblem: (outfit) => buildEmblem(THREE, outfit, D),
  };
  avatar._cycleIndex = 0;

  return avatar;
}

// ── Body silhouette ────────────────────────────────────────────────────

function buildPeterBody(THREE, { bodyMat, accentMat, headMat, D }) {
  const group = new THREE.Group();
  group.name = "peter_network_mesh";

  // Body — flat-bottomed capsule.
  const torsoR = 0.55 * D;
  const torsoCyl = 0.95 * D;
  const torsoBaseY = -0.60 * D;

  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(torsoR, torsoR, torsoCyl, 40, 1, false),
    bodyMat,
  );
  cyl.position.y = torsoBaseY + torsoCyl / 2;
  cyl.castShadow = true;
  cyl.receiveShadow = true;
  group.add(cyl);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(torsoR, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    bodyMat,
  );
  dome.position.y = torsoBaseY + torsoCyl;
  dome.castShadow = true;
  group.add(dome);

  // Ground rim.
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(torsoR, 0.05 * D, 16, 48),
    accentMat,
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = torsoBaseY;
  rim.castShadow = true;
  group.add(rim);

  // Head.
  const headR = 0.35 * D;
  const headY = torsoBaseY + torsoCyl + torsoR + headR * 0.75;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(headR, 24, 18),
    headMat,
  );
  head.position.y = headY;
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  // Arms — stubby spheres each side.
  for (const sign of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.SphereGeometry(0.15 * D, 14, 12),
      accentMat,
    );
    arm.scale.set(0.8, 1.5, 0.8);
    arm.position.set(sign * (torsoR + 0.06 * D), torsoBaseY + torsoCyl * 0.55, 0);
    arm.castShadow = true;
    group.add(arm);
  }

  group.userData.headTopY = headY + headR;
  return group;
}

// ── Emblem dispatcher ──────────────────────────────────────────────────

function buildEmblem(THREE, outfit, D) {
  const kind = outfit.emblem;
  switch (kind) {
    case "mortarboard":  return mortarboardEmblem(THREE, D, outfit);
    case "bookstack":    return bookstackEmblem(THREE, D, outfit);
    case "scroll":       return scrollOutfitEmblem(THREE, D, outfit);
    case "scales":       return scalesEmblem(THREE, D, outfit);
    case "barchart":     return barchartEmblem(THREE, D, outfit);
    case "briefcase":    return briefcaseOutfitEmblem(THREE, D, outfit);
    default:             return new THREE.Group();
  }
}

function mortarboardEmblem(THREE, D, outfit) {
  const SPEC = EMBLEMS.mortarboard;
  const COL = EMBLEM_COLOURS.mortarboard;
  const g = new THREE.Group();
  g.name = "emblem_mortarboard";

  const boardMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COL.board), roughness: 0.7, metalness: 0.05,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COL.cap), roughness: 0.7, metalness: 0.05,
  });
  const tasselMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COL.tassel),
    emissive: new THREE.Color(COL.tassel),
    emissiveIntensity: 0.25,
    roughness: 0.3, metalness: 0.5,
  });

  const liftY = SPEC.lift;

  // Board on top.
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(SPEC.boardW, SPEC.boardH, SPEC.boardD),
    boardMat,
  );
  board.position.y = liftY + SPEC.capH + SPEC.boardH / 2;
  board.castShadow = true;
  g.add(board);

  // Cap cylinder.
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(SPEC.capR, SPEC.capR, SPEC.capH, 20),
    capMat,
  );
  cap.position.y = liftY + SPEC.capH / 2;
  cap.castShadow = true;
  g.add(cap);

  // Tassel — thin cylinder hanging from the corner.
  const tassel = new THREE.Mesh(
    new THREE.CylinderGeometry(SPEC.tasselR, SPEC.tasselR, SPEC.tasselH, 10),
    tasselMat,
  );
  tassel.position.set(
    SPEC.boardW * 0.45,
    liftY + SPEC.capH + SPEC.boardH - SPEC.tasselH / 2,
    SPEC.boardD * 0.45,
  );
  tassel.castShadow = true;
  g.add(tassel);

  return g;
}

function bookstackEmblem(THREE, D, outfit) {
  const SPEC = EMBLEMS.bookstack;
  const COL = EMBLEM_COLOURS.bookstack;
  const g = new THREE.Group();
  g.name = "emblem_bookstack";

  const bookMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COL.cover), roughness: 0.75,
  });
  const giltMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COL.gilt),
    emissive: new THREE.Color(COL.gilt),
    emissiveIntensity: 0.15,
    roughness: 0.3, metalness: 0.6,
  });

  let y = SPEC.lift;
  for (const b of SPEC.books) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), bookMat);
    mesh.position.y = y + b.h / 2;
    mesh.castShadow = true;
    g.add(mesh);
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(b.w * 0.92, b.h * SPEC.giltFrac, b.d * 0.04),
      giltMat,
    );
    trim.position.set(0, y + b.h * 0.5, b.d / 2 - b.d * 0.02);
    g.add(trim);
    y += b.h + 0.01 * D;
  }
  return g;
}

function scrollOutfitEmblem(THREE, D, outfit) {
  const SPEC = EMBLEMS.scroll;
  const COL = EMBLEM_COLOURS.scroll;
  const g = new THREE.Group();
  g.name = "emblem_scroll";

  const parchMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COL.parchment), roughness: 0.75, metalness: 0.02,
  });
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COL.ribbon), roughness: 0.55, metalness: 0.05,
  });

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(SPEC.radius, SPEC.radius, SPEC.length, 20),
    parchMat,
  );
  body.rotation.z = Math.PI / 2;
  body.position.y = SPEC.lift;
  body.castShadow = true;
  g.add(body);

  const ribbon = new THREE.Mesh(
    new THREE.CylinderGeometry(SPEC.radius * 1.1, SPEC.radius * 1.1, SPEC.length * 0.18, 20),
    ribbonMat,
  );
  ribbon.rotation.z = Math.PI / 2;
  ribbon.position.y = SPEC.lift;
  ribbon.castShadow = true;
  g.add(ribbon);

  return g;
}

function scalesEmblem(THREE, D, outfit) {
  const SPEC = EMBLEMS.scales;
  const COL = EMBLEM_COLOURS.scales;
  const g = new THREE.Group();
  g.name = "emblem_scales";

  const metalMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COL.metal),
    emissive: new THREE.Color(COL.emissive),
    emissiveIntensity: 0.08,
    roughness: 0.3, metalness: 0.6,
  });

  const baseY = SPEC.lift;
  // Central pillar.
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(SPEC.pillarR, SPEC.pillarR, SPEC.pillarH, 14),
    metalMat,
  );
  pillar.position.y = baseY + SPEC.pillarH / 2;
  pillar.castShadow = true;
  g.add(pillar);

  // Horizontal beam.
  const beamY = baseY + SPEC.pillarH;
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(SPEC.beamW, SPEC.beamH, SPEC.beamD),
    metalMat,
  );
  beam.position.y = beamY;
  beam.castShadow = true;
  g.add(beam);

  // Two pans hanging from each end of the beam.
  for (const sign of [-1, 1]) {
    const chain = new THREE.Mesh(
      new THREE.CylinderGeometry(SPEC.chainR, SPEC.chainR, SPEC.chainLen, 8),
      metalMat,
    );
    chain.position.set(sign * SPEC.beamW * 0.45, beamY - SPEC.chainLen / 2, 0);
    g.add(chain);

    const pan = new THREE.Mesh(
      new THREE.CylinderGeometry(SPEC.panR, SPEC.panR, SPEC.panH, 16),
      metalMat,
    );
    pan.position.set(sign * SPEC.beamW * 0.45, beamY - SPEC.chainLen - SPEC.panH / 2, 0);
    pan.castShadow = true;
    g.add(pan);
  }

  return g;
}

function barchartEmblem(THREE, D, outfit) {
  const SPEC = EMBLEMS.barchart;
  const COL = EMBLEM_COLOURS.barchart;
  const g = new THREE.Group();
  g.name = "emblem_barchart";

  const barMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COL.bar),
    emissive: new THREE.Color(COL.emissive),
    emissiveIntensity: 0.2,
    roughness: 0.4, metalness: 0.1,
  });

  // Three bars ascending left to right.
  const totalW = 3 * SPEC.barW + 2 * SPEC.gap;
  const startX = -totalW / 2 + SPEC.barW / 2;
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(SPEC.barW, SPEC.barH[i], SPEC.barD),
      barMat,
    );
    bar.position.set(
      startX + i * (SPEC.barW + SPEC.gap),
      SPEC.lift + SPEC.barH[i] / 2,
      0,
    );
    bar.castShadow = true;
    g.add(bar);
  }

  return g;
}

function briefcaseOutfitEmblem(THREE, D, outfit) {
  const SPEC = EMBLEMS.briefcase;
  const COL = EMBLEM_COLOURS.briefcase;
  const g = new THREE.Group();
  g.name = "emblem_briefcase";

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COL.leather),
    roughness: 0.6, metalness: 0.1,
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(SPEC.width, SPEC.height, SPEC.depth),
    mat,
  );
  body.position.y = SPEC.lift + SPEC.height / 2;
  body.castShadow = true;
  g.add(body);

  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(SPEC.width * 0.28, SPEC.handleR, 8, 20, Math.PI),
    mat,
  );
  handle.position.y = SPEC.lift + SPEC.height + SPEC.handleR;
  handle.castShadow = true;
  g.add(handle);

  return g;
}
