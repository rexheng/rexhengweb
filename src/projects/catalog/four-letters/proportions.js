// Four Letters — 4×4 letter-tile grid sprite proportions.
//
// Silhouette decomposition:
//
//   ┌──┐┌──┐┌──┐┌──┐      row of 4 cube tiles
//   ┌──┐┌──┐┌──┐┌──┐      …×4 rows
//   ┌──┐┌──┐┌──┐┌──┐
//   ┌──┐┌──┐┌──┐┌──┐
//   ═════════════════     dark base plate under the grid
//
// D=0.26 (slot radius). Grid spans 1.60×D × 1.60×D on the base plate,
// giving a square puzzle-board silhouette.

export const D = 0.26;

export const GRID = 4;   // 4x4 tiles

export const SIZES = {
  tileSize:      0.32 * D,   // cube-ish, slightly flatter than a cube
  tileHeight:    0.22 * D,
  tileGap:       0.04 * D,
  // Grid side total = 4 * tileSize + 3 * tileGap = 1.40*D
  basePadding:   0.08 * D,
  // Base side = gridSide + 2 * basePadding = 1.56*D
  baseHeight:    0.08 * D,
  baseY:        -0.30 * D,

  letterInset:   0.02 * D,    // how deep the letter pockets in
  letterSize:    0.16 * D,    // planar width of the letter face
  letterHeight:  0.005 * D,   // printed depth
};

// Letters across rows, top to bottom, left to right. 16 cells.
// "REX " across the first row; remainder blank.
export const LETTERS = [
  "R", "E", "X", "",
  "",  "",  "",  "",
  "",  "",  "",  "",
  "",  "",  "",  "",
];

export const COLOURS = {
  tileFace:    "#f5ead2",
  tileSide:    "#d47a42",
  letterFace:  "#2b1f16",
  gridBase:    "#1a1512",
};
