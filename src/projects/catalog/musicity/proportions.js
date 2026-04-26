// Musicity — voxel apartment block with realistic proportions.
// See spec §3.6.

export const VOXEL_SIZE = 0.05;     // MJ-units per voxel
export const GRID = { w: 5, h: 14, d: 4 };

// Building anatomy:
//   - 5 wide × 4 deep footprint (slim apartment block, not a cube)
//   - 14 tall: ground floor + 4 standard floors + setback penthouse
//   - Each standard floor is 2 voxels tall with a slab on top (3-vox period)
//   - Window strips run between the slab bands so the building reads as
//     stacked floors from any side
//   - Penthouse setback at y=12 narrows to interior columns
//   - Rooftop water tank centred on the setback
//
// Cell encoding:
//   0 = empty
//   1 = wall
//   2 = window
//   3 = balcony slab (extruded one voxel forward at build time)
export function generateApartment() {
  const W = GRID.w, H = GRID.h, D = GRID.d;
  const v = new Uint8Array(W * H * D);
  const idx = (x, y, z) => x + W * (y + H * z);
  const onPerim = (x, z) => x === 0 || x === W - 1 || z === 0 || z === D - 1;

  // Ground floor: solid walls all around, double-door cut on front face.
  // Standard floors stack on top: walls at the corners + window strips
  // between, slab caps the floor on the y=top voxel.
  // Floor slabs sit at y = 0, 3, 6, 9, 12.
  const FLOOR_BASES = [0, 3, 6, 9];
  const PENTHOUSE_BASE = 12;

  // Ground floor (y = 0..2): full perimeter walls, with a door cut.
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      if (onPerim(x, z)) {
        v[idx(x, 0, z)] = 1;
        v[idx(x, 1, z)] = 1;
        v[idx(x, 2, z)] = 1;     // slab on top of ground floor
      } else {
        v[idx(x, 2, z)] = 1;     // interior slab so the next floor sits on something
      }
    }
  }
  // Door cut on the front face (z = 0): two-voxel-wide centred entrance.
  const doorL = Math.floor(W / 2) - 1;
  const doorR = Math.floor(W / 2);
  for (let dy = 0; dy < 2; dy++) {
    v[idx(doorL, dy, 0)] = 0;
    v[idx(doorR, dy, 0)] = 0;
  }

  // Standard floors at base y = 3, 6, 9.
  for (let i = 1; i < FLOOR_BASES.length; i++) {
    const fy = FLOOR_BASES[i];
    // Slab at fy+2 (top of this floor's interior space).
    for (let z = 0; z < D; z++) {
      for (let x = 0; x < W; x++) {
        v[idx(x, fy + 2, z)] = 1;
      }
    }
    // Walls only at the corners — each face has window strips between.
    for (let dy = 0; dy < 2; dy++) {
      const y = fy + dy;
      // Corners.
      v[idx(0,     y, 0    )] = 1;
      v[idx(W - 1, y, 0    )] = 1;
      v[idx(0,     y, D - 1)] = 1;
      v[idx(W - 1, y, D - 1)] = 1;
      // Mid-pier on long sides (x=0 and x=W-1 walls) so the windows
      // read as paired bays, not one giant slit.
      const midZ = Math.floor(D / 2);
      v[idx(0,     y, midZ )] = 1;
      v[idx(W - 1, y, midZ )] = 1;
      // Window strips fill the rest of the perimeter.
      for (let z = 0; z < D; z++) {
        for (let x = 0; x < W; x++) {
          if (!onPerim(x, z)) continue;
          if (v[idx(x, y, z)] === 1) continue;     // already a wall
          v[idx(x, y, z)] = 2;
        }
      }
    }
    // Balcony tile: front-middle, base of this floor.
    const midX = Math.floor(W / 2);
    v[idx(midX, fy, 0)] = 3;
  }

  // Penthouse setback at y = 12. Inset by one voxel on every side,
  // making the top read as a smaller crown sitting on the slab below.
  for (let dy = 0; dy < 2; dy++) {
    const y = PENTHOUSE_BASE + dy;
    for (let z = 1; z < D - 1; z++) {
      for (let x = 1; x < W - 1; x++) {
        const isPerim = (x === 1 || x === W - 2 || z === 1 || z === D - 2);
        if (!isPerim) continue;
        // Penthouse is mostly glass — corner posts only.
        const isCorner = ((x === 1 || x === W - 2) && (z === 1 || z === D - 2));
        v[idx(x, y, z)] = isCorner ? 1 : 2;
      }
    }
  }
  // Penthouse roof slab.
  for (let z = 1; z < D - 1; z++) {
    for (let x = 1; x < W - 1; x++) {
      v[idx(x, PENTHOUSE_BASE + 2, z)] = 1;
    }
  }
  // Rooftop water tank — single solid voxel centred above the penthouse.
  const midX = Math.floor(W / 2);
  const midZ = Math.floor(D / 2);
  v[idx(midX, PENTHOUSE_BASE + 3, midZ)] = 1;

  return v;
}

export const PALETTES = [
  { wall: "#d4a05a", window: "#f3d27a", balcony: "#8b6a3a" }, // current Musicity warm
  { wall: "#5a7d8c", window: "#a8d4e0", balcony: "#2c4148" }, // teal
  { wall: "#c97064", window: "#f4c5b8", balcony: "#7a3429" }, // terracotta
  { wall: "#7e6b9e", window: "#cdb8e0", balcony: "#3d2e54" }, // mauve
  { wall: "#6b8e5a", window: "#c5d9b0", balcony: "#3a4d2c" }, // moss
];

export const PALETTE_PERIOD_MS = 2500;
