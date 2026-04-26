// Musicity — voxel apartment block + palette cycle.
// See spec §3.6.

export const VOXEL_SIZE = 0.06;     // MJ-units per voxel
export const GRID = { w: 10, h: 10, d: 10 };

// Voxel layout helper. Returns Uint8Array[w*h*d] where each cell is:
//   0 = empty
//   1 = wall
//   2 = window
//   3 = balcony
// Floors at y = 0, 3, 6, 9. Walls on perimeter. One door cut at front-
// middle of ground floor. Two windows per cardinal face on each non-
// ground floor. One balcony tile in front-middle of each non-ground floor.
export function generateApartment() {
  const W = GRID.w, H = GRID.h, D = GRID.d;
  const v = new Uint8Array(W * H * D);
  const idx = (x, y, z) => x + W * (y + H * z);

  const FLOORS = [0, 3, 6, 9];
  for (const fy of FLOORS) {
    for (let z = 0; z < D; z++) {
      for (let x = 0; x < W; x++) {
        // Floor slab.
        v[idx(x, fy, z)] = 1;
        // Perimeter walls one voxel above the floor (only on non-top floors).
        if (fy < H - 1) {
          const onPerim = (x === 0 || x === W - 1 || z === 0 || z === D - 1);
          if (onPerim) {
            v[idx(x, fy + 1, z)] = 1;
            v[idx(x, fy + 2, z)] = 1;
          }
        }
      }
    }
  }

  // Door cut: ground floor (fy = 0), front face (z = 0), middle x.
  const midX = Math.floor(W / 2);
  v[idx(midX, 1, 0)] = 0;
  v[idx(midX, 2, 0)] = 0;

  // Windows on non-ground floors. Two per cardinal face per floor.
  for (let i = 1; i < FLOORS.length; i++) {
    const fy = FLOORS[i];
    const winY = fy + 1;
    // Front (z=0) and back (z=D-1).
    v[idx(2, winY, 0)] = 2;       v[idx(W - 3, winY, 0)] = 2;
    v[idx(2, winY, D - 1)] = 2;   v[idx(W - 3, winY, D - 1)] = 2;
    // Left (x=0) and right (x=W-1).
    v[idx(0, winY, 2)] = 2;       v[idx(0, winY, D - 3)] = 2;
    v[idx(W - 1, winY, 2)] = 2;   v[idx(W - 1, winY, D - 3)] = 2;
  }

  // Balcony tile: front-middle of each non-ground floor, extruded one
  // voxel forward (z = -1, but we model as z = 0 with type=3 and let
  // the per-instance matrix push it forward at build time).
  for (let i = 1; i < FLOORS.length; i++) {
    const fy = FLOORS[i];
    v[idx(midX, fy, 0)] = 3;
  }

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
