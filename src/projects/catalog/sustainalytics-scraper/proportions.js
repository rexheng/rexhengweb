// Sustainalytics Scraper — stacked-boxes sprite proportions.
//
// Silhouette:
//
//          ┌──┐           small box (leaf emblem on top)
//         ┌────┐          medium box
//        ┌──────┐         large box (base)
//
// Three descending cubes, stacked slightly off-centre for a lived-in look.

export const D = 0.26;

export const SIZES = {
  box1Width:  1.40 * D,   // bottom box
  box1Height: 0.75 * D,
  box1Depth:  1.10 * D,

  box2Width:  1.05 * D,
  box2Height: 0.55 * D,
  box2Depth:  0.85 * D,
  box2OffsetX: 0.10 * D,  // slight nudge

  box3Width:  0.70 * D,
  box3Height: 0.45 * D,
  box3Depth:  0.60 * D,
  box3OffsetX: -0.08 * D,

  // Tape bands — thin dark strips across the tops.
  tapeHeight: 0.04 * D,

  // Leaf emblem on box3.
  leafRadius: 0.18 * D,
  leafDepth:  0.02 * D,

  baseY:     -0.40 * D,
};

export const COLOURS = {
  cardboardLight: "#c0996d",
  cardboardDark:  "#8b6d4a",
  tape:           "#5d4226",
  leaf:           "#6b9b5f",
  leafDark:       "#4a6c3f",
};
