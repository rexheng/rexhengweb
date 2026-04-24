// Arrow — upward geometric arrow.
//
// Silhouette:
//   1. Elongated tetrahedron shaft — 1.8×D tall.
//   2. Stubby pyramid head at the top — 0.45×D radius × 0.45×D tall.

export const D = 0.26;

export const SIZES = {
  shaftRBottom: 0.18 * D,
  shaftRTop:    0.22 * D,
  shaftH:       1.80 * D,
  shaftBaseY:  -0.90 * D,

  headRBase:    0.45 * D,
  headH:        0.45 * D,
};

export const COLOURS = {
  arrow:         "#8a6ad9",
  arrowEmissive: "#b49cff",
};
