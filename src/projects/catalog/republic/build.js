// Republic — Doric column builder.
//
// Pure dependency-injected builder. Composes the column as a vertical stack
// of primitives from builders/primitives.js, using the proportion constants
// from ./proportions.js. Runs from base (y=plinthBaseY) upward.
//
// See spec §4.2 + §6.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const mats = materials.forProject(THREE, {
    marble: COLOURS.marble,
    marbleShadow: COLOURS.marbleShadow,
  });

  const group = new THREE.Group();
  group.name = "republic_mesh";

  // ── Plinth (bottom). ────────────────────────────────────────────────────
  const plinthY = SIZES.plinthBaseY + SIZES.plinthH / 2;
  const plinth = primitives.disc(THREE, {
    radius: SIZES.plinthR,
    height: SIZES.plinthH,
    material: mats.marble,
  });
  plinth.position.y = plinthY;
  group.add(plinth);

  // ── Base torus — sits on the plinth. ───────────────────────────────────
  const baseY = SIZES.plinthBaseY + SIZES.plinthH + SIZES.baseH / 2;
  const base = primitives.ringBand(THREE, {
    radius: SIZES.baseR,
    tubeRadius: SIZES.baseTubeRadius,
    material: mats.marble,
    y: baseY,
  });
  group.add(base);

  // Thin dark shadow band where the base meets the plinth, for grounding.
  const baseShadow = primitives.disc(THREE, {
    radius: SIZES.baseR - 0.02 * proportions.D,
    height: 0.02 * proportions.D,
    material: mats.marbleShadow,
  });
  baseShadow.position.y = SIZES.plinthBaseY + SIZES.plinthH + 0.01 * proportions.D;
  group.add(baseShadow);

  // ── Shaft — fluted lathe. ──────────────────────────────────────────────
  const shaftBaseY = SIZES.plinthBaseY + SIZES.plinthH + SIZES.baseH;
  const shaft = primitives.flutedColumn(THREE, {
    shaftRBottom: SIZES.shaftRBottom,
    shaftRTop: SIZES.shaftRTop,
    shaftH: SIZES.shaftH,
    flutes: SIZES.flutes,
    material: mats.marble,
  });
  shaft.position.y = shaftBaseY;
  group.add(shaft);

  // ── Necking — short cylinder between shaft and echinus. ────────────────
  const neckingY = shaftBaseY + SIZES.shaftH + SIZES.neckingH / 2;
  const necking = primitives.disc(THREE, {
    radius: SIZES.neckingR,
    height: SIZES.neckingH,
    material: mats.marble,
  });
  necking.position.y = neckingY;
  group.add(necking);

  // ── Echinus — flared frustum. ──────────────────────────────────────────
  const echinusY = shaftBaseY + SIZES.shaftH + SIZES.neckingH + SIZES.echinusH / 2;
  const echinus = primitives.flaredFrustum(THREE, {
    rBottom: SIZES.echinusRBottom,
    rTop: SIZES.echinusRTop,
    height: SIZES.echinusH,
    material: mats.marble,
  });
  echinus.position.y = echinusY;
  group.add(echinus);

  // ── Abacus — square slab on top. ───────────────────────────────────────
  const abacusY = shaftBaseY + SIZES.shaftH + SIZES.neckingH + SIZES.echinusH + SIZES.abacusH / 2;
  const abacus = primitives.abacus(THREE, {
    width: SIZES.abacusW,
    height: SIZES.abacusH,
    material: mats.marble,
  });
  abacus.position.y = abacusY;
  group.add(abacus);

  return group;
}
