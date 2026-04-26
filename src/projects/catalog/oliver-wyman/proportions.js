// Oliver Wyman — floating 3D dual-line chart. See spec §3.7.
//
// No solid panels: the chart is just a transparent grid frame with two
// animated lines (red + blue) drawn against it. Reads as data first,
// not as a sculpture.

export const D = 0.36;

export const SIZES = {
  // Chart frame extents (used to position grid lines + line points).
  frameW:        1.00 * D,    // x extent
  frameH:        0.90 * D,    // y extent (chart height)
  frameD:        0.10 * D,    // z extent — shallow so it reads as flat-ish

  // Line graph.
  lineRadius:    0.014,        // tube radius (slightly thinner so the two
                               //   colours don't merge visually)
  pointCount:    5,            // 5 years / 5 columns

  // Padding so the lines don't clip the frame.
  padX:          0.08 * D,
  padY:          0.08 * D,

  // Grid line thickness.
  gridLineWidth: 1.5,
};

export const COLOURS = {
  lineBlue:      "#1f4ba5",   // OW navy
  lineRed:       "#d4382c",   // signal red
  grid:          "#ffffff",   // white grid lines (rendered with alpha)
  axis:          "#ffffff",   // x/y axes (slightly stronger alpha than grid)
};

export const ALPHA = {
  grid: 0.18,                  // faint interior grid
  axis: 0.40,                  // bottom + left axes a touch more visible
};

// Animation constants used by the onSpawn idle hook.
export const ANIM = {
  cyclePeriodMs: 5000,         // time to lerp between target value sets
  valueMin:      0.10,
  valueMax:      0.92,
  monotonicBias: 0.55,         // 55% chance each new target trends upward
};
