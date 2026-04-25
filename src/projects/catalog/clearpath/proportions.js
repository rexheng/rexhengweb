// ClearPath — rectangular NHS block.
//
// Silhouette: a single landscape-oriented rectangular slab in NHS corporate
// blue with white "NHS" lettering across the front face. Reads as the NHS
// logo plate. Sits with its base flush on the floor.

export const D = 0.26;

export const SIZES = {
  // Block dimensions (X = width, Y = height, Z = depth).
  blockW:    2.40 * D,
  blockH:    1.20 * D,
  blockD:    0.30 * D,
  blockBaseY: -0.60 * D,   // bottom of the block in body-local space

  // White "NHS" plate on the front face — a thin slab inset over the front.
  letterPlateW: 1.80 * D,
  letterPlateH: 0.70 * D,
  letterPlateD: 0.04 * D,  // protrudes a sliver in front of the block
};

export const COLOURS = {
  block:   "#005eb8",   // NHS corporate blue
  letters: "#ffffff",
};
