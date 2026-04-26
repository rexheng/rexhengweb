// Oliver Wyman — 3D line-chart sculpture. See spec §3.7.

export const D = 0.36;

export const SIZES = {
  // Chart frame (back wall + floor panel + side wall — an L-bracket).
  frameW:        1.00 * D,    // x extent
  frameH:        0.90 * D,    // y extent (chart height)
  frameD:        0.90 * D,    // z extent (depth into page)
  panelThick:    0.025 * D,   // back/floor/side panel thickness

  // Pedestal beneath the chart.
  pedestalR:     0.65 * D,
  pedestalH:     0.06 * D,

  // Line graph.
  lineRadius:    0.018,        // tube radius
  pointCount:    5,            // 5 years / 5 columns like the reference

  // Padding so the line doesn't clip into the panels.
  padX:          0.08 * D,
  padY:          0.08 * D,
  padZ:          0.45 * D,     // line sits on the floor near the back
};

export const COLOURS = {
  line:        "#1f4ba5",   // OW navy
  panelLight:  "#dde0e3",   // pale grey
  panelMid:    "#b8bcc1",   // mid grey
  panelDark:   "#8e9298",   // darker grey for side wall
  grid:        "#ffffff",   // white grid lines
  pedestal:    "#3a3d42",
};

// Animation constants used by the onSpawn idle hook.
export const ANIM = {
  cyclePeriodMs: 5000,        // time to lerp between target value sets
  valueMin:      0.15,        // fraction of frameH (lower bound for any point)
  valueMax:      0.92,        // upper bound — leave a hair of headroom
  monotonicBias: 0.55,        // chance each new target is upward-trending
};
