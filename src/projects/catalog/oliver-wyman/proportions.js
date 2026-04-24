// Oliver Wyman — running track + scatterplot trend line.
//
// Silhouette:
//   1. Stadium track — oval ring 1.5×D × 0.9×D, tube 0.08×D, on a pedestal.
//   2. Pedestal — short wide cylinder 1.6×D × 0.08×D.
//   3. Scatterplot trend — 7 small spheres inside the track forming an
//      ascending line from left to right.

export const D = 0.26;

export const SIZES = {
  // Pedestal beneath the track.
  pedestalR:       1.00 * D,
  pedestalH:       0.08 * D,
  pedestalBaseY:  -0.85 * D,

  // Track — oval ring.
  trackOuterW:     1.50 * D,
  trackOuterD:     0.90 * D,
  trackTubeR:      0.08 * D,
  trackY:          0.00,     // track centreline y, relative to track origin

  // Scatter dots — 7 spheres.
  dotCount:        7,
  dotR:            0.055 * D,
  dotY:            0.00,     // same height as the track centreline
  // Trend line: x from -0.55*D to +0.55*D, y rising from -0.2*D to +0.2*D.
  dotXMin:        -0.55 * D,
  dotXMax:         0.55 * D,
  dotZMin:        -0.24 * D,
  dotZMax:         0.24 * D,
};

export const COLOURS = {
  track:    "#e6372a",  // Oliver Wyman red
  pedestal: "#4a4a4a",
  dotLow:   "#f6a49d",
  dotHigh:  "#b0221a",
};
