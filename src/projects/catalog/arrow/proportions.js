// Arrow — upward arrow encased in a transparent glass cube.
//
// Silhouette:
//   1. Inner arrow — tapered shaft + pyramidal head, glowing purple.
//   2. Outer glass cube — transparent box wrapping the arrow.

export const D = 0.26;

export const SIZES = {
  // Inner arrow — slightly shorter than the cube so it fits with margin.
  shaftRBottom: 0.14 * D,
  shaftRTop:    0.18 * D,
  shaftH:       1.20 * D,
  shaftBaseY:  -0.60 * D,

  headRBase:    0.36 * D,
  headH:        0.36 * D,

  // Glass cube — encloses the arrow.
  cubeSize:     1.80 * D,
  cubeBaseY:   -0.90 * D,
};

export const COLOURS = {
  arrow:         "#8a6ad9",
  arrowEmissive: "#b49cff",
  glass:         "#cfe7ff",
  glassEmissive: "#7fb3ff",
  glassEdge:     "#aac8e8",
};
