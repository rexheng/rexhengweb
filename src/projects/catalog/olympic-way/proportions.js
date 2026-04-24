// Olympic Way — London Underground roundel on a plinth.
//
// Silhouette decomposition (§5):
//
//   1. Roundel torus   — red ring, outer 0.85×D, tube 0.12×D.
//   2. Horizontal bar  — blue box, 1.75×D wide × 0.28×D tall × 0.10×D deep,
//                        threaded through the centre of the torus.
//   3. Text plate      — white slab in the centre of the bar.
//   4. Plinth          — short wide cylinder beneath the roundel, 1.0×D ×
//                        0.20×D.
//
// Palette matches the Transport for London house style:
//   * Underground red  #dc241f
//   * Corporate blue   #003688
//   * White text plate #ffffff
//
// Base unit D is the slot's collision capsule radius.

export const D = 0.26;

export const SIZES = {
  roundelOuterR:   0.85 * D,
  roundelTubeR:    0.12 * D,

  barW:            1.75 * D,
  barH:            0.28 * D,
  barD:            0.10 * D,

  plateInsetFrac:  0.42, // plate width = bar × plateInsetFrac (kept on primitive)

  plinthR:         1.00 * D,
  plinthH:         0.20 * D,

  // Vertical composition — roundel sits above the plinth.
  plinthBaseY:    -1.30 * D,
  // Roundel Y centre — roundel tube + bar sit at this y.
  roundelY:        0.00 * D,
};

export const COLOURS = {
  torus:  "#dc241f",
  bar:    "#003688",
  plate:  "#ffffff",
  plinth: "#3a3a3a",
};
