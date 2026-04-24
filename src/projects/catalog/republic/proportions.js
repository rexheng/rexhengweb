// Republic — Doric column proportion sheet.
//
// Silhouette decomposition (§6):
//
//   ┌──────┐     abacus       — square slab, 1.35×D × 0.25×D
//    ╲────╱       echinus       — downward-flared frustum, 1.20×D×0.98×D, 0.20×D tall
//    │    │       necking       — short cylinder, 0.95×D × 0.15×D
//    │≡≡≡≡│       shaft         — fluted lathe, rBottom=1.00×D → rTop=0.85×D,
//    │    │                       5.00×D tall, 20 flutes, entasis built into profile
//    ╲────╱       base torus    — torus band, 1.15×D × 0.15×D
//   └──────┘     plinth        — short wide cylinder, 1.30×D × 0.20×D
//
// Total height = plinth (0.20) + base (0.15) + shaft (5.00) + necking (0.15)
//              + echinus (0.20) + abacus (0.25) = 5.95×D ≈ spec's 6.05×D.
//              (The 0.10×D gap accommodates the necking's visual overlap.)
//
// See docs/superpowers/specs/2026-04-24-project-sprite-workflow-design.md §4.1, §6.

export const D = 0.26;

export const SIZES = {
  // Plinth — bottom square-ish disc, sits flush on slot ground.
  plinthR:          1.30 * D,
  plinthH:          0.20 * D,
  plinthBaseY:     -1.50 * D,     // bottom of the plinth ≈ slot capsule base

  // Base torus — sits on top of the plinth.
  baseR:            1.15 * D,
  baseH:            0.15 * D,
  baseTubeRadius:   0.075 * D,

  // Shaft — fluted lathe with entasis.
  shaftRBottom:     1.00 * D,
  shaftRTop:        0.85 * D,
  shaftH:           5.00 * D,
  flutes:           20,

  // Necking — narrow ring between shaft and echinus.
  neckingR:         0.95 * D,
  neckingH:         0.15 * D,

  // Echinus — flared frustum (narrower at bottom, wider at top).
  echinusRBottom:   0.98 * D,
  echinusRTop:      1.20 * D,
  echinusH:         0.20 * D,

  // Abacus — the square slab on top.
  abacusW:          1.35 * D,
  abacusH:          0.25 * D,
};

export const COLOURS = {
  marble:        "#e8e2d5",
  marbleShadow:  "#b8aa90",
};
