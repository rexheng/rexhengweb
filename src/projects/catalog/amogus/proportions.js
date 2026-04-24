// Amogus — proportion sheet.
//
// Silhouette decomposition (vs §5 acceptance table):
//
//   1. Body         — flat-bottomed capsule (cylinder + top hemisphere).
//                     Width 1×D, height 2.4×D. NOT a scaled sphere.
//   2. Visor        — wide wraparound band, 1.2×D × 0.55×D, clipped box.
//                     Sits at 0.95×D above body centre, ~60% of face width.
//   3. Legs         — two short cylinders (capsule tops) at wide stance.
//                     Each 0.28×D wide × 0.55×D tall, centres at ±0.40×D.
//   4. Backpack     — half-box hugging the back curve. 0.78×D × 1.30×D ×
//                     0.42×D, centred ~0.45×D behind the body.
//   5. Antenna      — thin cylinder + glowing tip on the pack's shoulder.
//
// Base unit D is the slot's collision capsule radius. Every dimension is a
// multiple of D so the sprite scales with the slot. No THREE imports, no
// logic — just exported constants. If build.js types a numeric literal or
// hex string, that's a bug.
//
// See docs/superpowers/specs/2026-04-24-project-sprite-workflow-design.md §4.1, §5.

export const D = 0.26;

export const SIZES = {
  // Body — flat-bottomed capsule. We model it as a cylinder plus a top hemi.
  bodyRadius:       1.00 * D,      // lateral half-width
  bodyCylHeight:    1.40 * D,      // straight section of the capsule
  bodyDomeHeight:   1.00 * D,      // hemisphere radius == bodyRadius
  // Total body height = bodyCylHeight + bodyDomeHeight = 2.40 * D ✓ (§5 row 2)
  bodyBaseY:       -1.20 * D,      // flat bottom sits at y = -1.20*D
  // Rim band at the base — reads as a grounded contact shadow.
  rimTubeRadius:    0.07 * D,
  rimY:            -1.20 * D,      // flush with the flat base

  // Visor — wide wraparound. Built as a clipped box with rounded ends.
  visorWidth:       1.20 * D,      // 60% of face circumference at the equator
  visorHeight:      0.55 * D,
  visorDepth:       0.24 * D,      // how far it bulges out of the body
  visorY:           0.25 * D,      // centre height (upper third of body)
  visorZ:           0.82 * D,      // stuck to the front face of the body
  // Inner glass — slightly inset, slightly taller-than-wide aspect.
  glassInset:       0.08 * D,      // all sides inset by this from the frame

  // Legs — stub cylinders, wide stance, flat bottoms.
  legRadius:        0.24 * D,
  legHeight:        0.58 * D,
  legCentreX:       0.40 * D,      // signed; outer edge reaches body widest point
  legCentreY:      -1.45 * D,      // sits below the body base
  legCentreZ:       0.00,

  // Backpack — half-box, hugs the back curve.
  packWidth:        0.78 * D,      // ≈ 39% of body width side-to-side
  packHeight:       1.30 * D,      // ≈ 54% of body height
  packDepth:        0.42 * D,      // extrudes ~0.3×D past the back curve
  packCentreY:      0.00,          // vertically centred on body
  packCentreZ:     -0.90 * D,      // behind the body, some overlap for hugging

  // Antenna — on top of the pack's shoulder.
  antennaRadius:    0.046 * D,
  antennaHeight:    0.16 * D,
  antennaX:         0.18 * D,
  antennaY:         0.62 * D,
  antennaZ:        -0.82 * D,
  antennaTipRadius: 0.058 * D,
  antennaTipGap:    0.02  * D,     // gap between antenna top and tip sphere
};

export const COLOURS = {
  body:         "#c51111",         // canonical Among Us red
  bodyShadow:   "#7a0e0e",         // ground-contact rim, dark underside
  visorGlass:   "#9acdd6",         // cooler than the old cyan, closer to canon
  visorFrame:   "#2a3844",         // helmet interior darkness
  packTrim:     "#a00d0d",         // slightly darker red for the pack shadow
  antennaTip:   "#ffe4a8",         // warm amber — emissive
  antennaTipEm: "#ffc860",         // emissive colour
  highlight:    "#ffffff",         // visor specular streak
};
