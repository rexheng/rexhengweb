// Peter Network — six outfits, cycled by the `cycle` ability.
//
// The sprite uses the shared `primitives.peterAvatar` silhouette and
// differs between outfits only in (1) the body/accent palette and (2) the
// emblem mesh that sits above the head.
//
// OUTFITS is the canonical ring traversed by `cycle`. Order is university
// outfits first, then theme outfits.

export const D = 0.26;

// Palette used by the shared peterAvatar parts, per outfit.
const HEAD = "#e8c4a2";

export const OUTFITS = [
  {
    id: "nus",
    label: "NUS · @nus.peter",
    palette: { body: "#ef7d00", accent: "#b55700", head: HEAD },
    emblem: "mortarboard",
  },
  {
    id: "lse",
    label: "LSE · @lse.peter",
    palette: { body: "#6b1f5f", accent: "#8a2f7f", head: HEAD },
    emblem: "bookstack",
  },
  {
    id: "cambridge",
    label: "Cambridge · @cambridge.peter",
    palette: { body: "#a3152b", accent: "#6d0e1d", head: HEAD },
    emblem: "scroll",
  },
  {
    id: "law",
    label: "Theme · Law",
    palette: { body: "#1a1a1a", accent: "#3a3a3a", head: HEAD },
    emblem: "scales",
  },
  {
    id: "finance",
    label: "Theme · Finance",
    palette: { body: "#0d3d2a", accent: "#1f6f4e", head: HEAD },
    emblem: "barchart",
  },
  {
    id: "career",
    label: "Theme · Career",
    palette: { body: "#1b2a4a", accent: "#334d80", head: HEAD },
    emblem: "briefcase",
  },
];

// Geometry constants for every emblem type. Referenced by build.js's
// rebuildEmblem() dispatcher.
export const EMBLEMS = {
  mortarboard: {
    boardW:  0.42 * D,  boardH:  0.04 * D,  boardD:  0.42 * D,
    capR:    0.14 * D,  capH:    0.08 * D,
    tasselR: 0.018 * D, tasselH: 0.18 * D,
    lift:    0.12 * D,
  },
  bookstack: {
    books: [
      { w: 0.42 * D, h: 0.07 * D, d: 0.30 * D },
      { w: 0.38 * D, h: 0.06 * D, d: 0.27 * D },
      { w: 0.34 * D, h: 0.05 * D, d: 0.24 * D },
    ],
    lift: 0.12 * D,
    giltFrac: 0.15,
  },
  scroll: {
    length: 0.44 * D,
    radius: 0.08 * D,
    lift:   0.20 * D,
  },
  scales: {
    pillarH:   0.26 * D,
    pillarR:   0.025 * D,
    beamW:     0.42 * D,
    beamH:     0.03 * D,
    beamD:     0.05 * D,
    panR:      0.09 * D,
    panH:      0.025 * D,
    chainLen:  0.08 * D,
    chainR:    0.01 * D,
    lift:      0.15 * D,
  },
  barchart: {
    barW:      0.07 * D,
    barD:      0.07 * D,
    barH:      [0.10 * D, 0.18 * D, 0.26 * D],
    gap:       0.03 * D,
    lift:      0.15 * D,
  },
  briefcase: {
    width:    0.40 * D,
    height:   0.22 * D,
    depth:    0.12 * D,
    handleR:  0.022 * D,
    lift:     0.17 * D,
  },
};

// Material tuning for accents that differ from the body/accent colours
// (e.g. mortarboard is always black, book covers are always dark).
export const EMBLEM_COLOURS = {
  mortarboard: {
    board:   "#1a1a1a",
    cap:     "#111111",
    tassel:  "#d4a84a",
  },
  bookstack: {
    cover:   "#2b1f16",
    gilt:    "#d4a84a",
  },
  scroll: {
    parchment: "#e8d6a7",
    ribbon:    "#a3152b",   // matches Cambridge body red
  },
  scales: {
    metal:    "#c8c8d0",
    emissive: "#ffffff",
  },
  barchart: {
    bar:      "#6bd18a",    // finance green mid
    emissive: "#a8e4b9",
  },
  briefcase: {
    leather:  "#1b2a4a",
    handle:   "#1b2a4a",
  },
};
