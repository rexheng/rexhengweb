// Sustainable Report Analyser — folder-with-page sprite proportions.
//
// Silhouette:
//
//         ▀▀▀▀▀                  page peeking out the top
//        ┌────────┐               folder cover (front face)
//        │   ⊙   │                magnifier ring on the cover
//        └────────┘               inside panel / back cover
//
// The folder is laid face-up on the ground (slab-like) so the sprite
// reads from top-down and oblique angles alike.

export const D = 0.26;

export const SIZES = {
  folderWidth:   1.60 * D,
  folderDepth:   1.10 * D,
  folderHeight:  0.18 * D,   // flat slab
  folderBaseY:  -0.40 * D,

  // Page peeking out the top: a slightly smaller slab slightly above and
  // shifted back.
  pageWidth:     1.30 * D,
  pageDepth:     0.95 * D,
  pageHeight:    0.02 * D,
  pageZOffset:  -0.12 * D,

  // Text lines on the page — 5 thin plates.
  lineWidth:     0.95 * D,
  lineHeight:    0.005 * D,
  lineDepth:     0.04 * D,
  linePitch:     0.12 * D,
  lineCount:     5,

  // Magnifier ring on the cover (outlined torus).
  lensRadius:    0.22 * D,
  lensTubeRadius: 0.04 * D,
  lensHandleLength: 0.30 * D,
  lensHandleRadius: 0.03 * D,
  lensCentreX:   0.32 * D,
  lensCentreZ:   0.20 * D,
};

export const COLOURS = {
  folderCover:  "#5a7b4a",
  folderInside: "#3a5230",
  pageCream:    "#f7f2e4",
  pageLines:    "#aaa18a",
  lensRing:     "#c9b58a",
  lensGlass:    "#bcd5d9",
};
