// Amogus procedural mesh — dependency-injected builder.
//
// Reads every dimension and colour from proportions.js via its argument.
// No inline magic numbers, no inline hex strings, no THREE import — all
// THREE/materials/primitives flow in through `deps` so this module can be
// reused from a headless render harness.
//
// Silhouette decomposition lives at the top of proportions.js.
// See docs/superpowers/specs/2026-04-24-project-sprite-workflow-design.md §4.2.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const mats = materials.forProject(THREE, {
    body: COLOURS.body,
    shadow: COLOURS.bodyShadow,
    visorGlass: COLOURS.visorGlass,
    visorFrame: COLOURS.visorFrame,
    packTrim: COLOURS.packTrim,
    antennaTip: COLOURS.antennaTip,
    antennaTipEm: COLOURS.antennaTipEm,
    highlight: COLOURS.highlight,
  });

  const group = new THREE.Group();
  group.name = "amogus_mesh";

  // ── Body — flat-bottomed capsule (cylinder + top dome). ─────────────────
  // The THREE loader rotates the MJ z-up frame so local +y is "up the
  // torso" — same convention as the pre-refactor build.
  const body = primitives.tictac(THREE, {
    radius: SIZES.bodyRadius,
    cylHeight: SIZES.bodyCylHeight,
    domeRadius: SIZES.bodyRadius,
    material: mats.body,
    baseY: SIZES.bodyBaseY,
  });
  group.add(body);

  // ── Grounded rim band at the flat base. ────────────────────────────────
  group.add(
    primitives.ringBand(THREE, {
      radius: SIZES.bodyRadius,
      tubeRadius: SIZES.rimTubeRadius,
      material: mats.shadow,
      y: SIZES.rimY,
    }),
  );

  // ── Visor — wraparound frame + inset glass + specular streak. ──────────
  const visor = new THREE.Group();
  visor.position.set(0, SIZES.visorY, SIZES.visorZ);

  const frameGeo = new THREE.BoxGeometry(
    SIZES.visorWidth,
    SIZES.visorHeight,
    SIZES.visorDepth,
  );
  // Bias the frame backward so the front face sits just proud of the body.
  frameGeo.translate(0, 0, -SIZES.visorDepth / 2);
  const frame = new THREE.Mesh(frameGeo, mats.visorFrame);
  frame.castShadow = true;
  visor.add(frame);

  const glassW = SIZES.visorWidth - SIZES.glassInset * 2;
  const glassH = SIZES.visorHeight - SIZES.glassInset * 2;
  const glassD = SIZES.visorDepth * 0.55;
  const glassGeo = new THREE.BoxGeometry(glassW, glassH, glassD);
  // Bevel the top corners so the glass reads as wraparound, not a flat box:
  // we achieve this cheaply by scaling a clipped sphere instead.
  const wrapGlass = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    mats.visorGlass,
  );
  wrapGlass.scale.set(glassW / 2, glassH / 1.8, glassD);
  wrapGlass.rotation.x = -Math.PI / 2;
  wrapGlass.position.set(0, 0, glassD * 0.25);
  visor.add(wrapGlass);

  // Thin specular streak on the upper-left of the glass.
  const hl = new THREE.Mesh(
    new THREE.PlaneGeometry(glassW * 0.45, glassH * 0.12),
    mats.highlight,
  );
  hl.position.set(-glassW * 0.22, glassH * 0.22, glassD * 0.55);
  hl.rotation.z = -0.18;
  visor.add(hl);

  group.add(visor);

  // ── Legs — wide stance, stub cylinders. ────────────────────────────────
  for (const sign of [-1, 1]) {
    const leg = primitives.stubLeg(THREE, {
      radius: SIZES.legRadius,
      height: SIZES.legHeight,
      material: mats.shadow,
      baseY: SIZES.legCentreY - SIZES.legHeight / 2,
    });
    leg.position.x = sign * SIZES.legCentreX;
    leg.position.z = SIZES.legCentreZ;
    group.add(leg);
  }

  // ── Backpack — half-box that hugs the back curve. ──────────────────────
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.packWidth, SIZES.packHeight, SIZES.packDepth),
    mats.body,
  );
  pack.position.set(0, SIZES.packCentreY, SIZES.packCentreZ);
  pack.castShadow = true;
  pack.receiveShadow = true;
  group.add(pack);

  // A thin darker band where the pack meets the body, for visual grounding.
  const packTrim = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.packWidth * 0.98, SIZES.packHeight * 0.08, SIZES.packDepth * 0.98),
    mats.packTrim,
  );
  packTrim.position.set(0, SIZES.packCentreY - SIZES.packHeight / 2 + SIZES.packHeight * 0.04, SIZES.packCentreZ);
  group.add(packTrim);

  // ── Antenna on the pack shoulder. ──────────────────────────────────────
  const antennaBase = new THREE.Mesh(
    new THREE.CylinderGeometry(SIZES.antennaRadius, SIZES.antennaRadius, SIZES.antennaHeight, 12),
    mats.visorFrame,
  );
  antennaBase.position.set(SIZES.antennaX, SIZES.antennaY, SIZES.antennaZ);
  antennaBase.castShadow = true;
  group.add(antennaBase);

  const antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(SIZES.antennaTipRadius, 12, 10),
    mats.antennaTip,
  );
  antennaTip.position.set(
    SIZES.antennaX,
    SIZES.antennaY + SIZES.antennaHeight / 2 + SIZES.antennaTipGap + SIZES.antennaTipRadius,
    SIZES.antennaZ,
  );
  group.add(antennaTip);

  return group;
}
