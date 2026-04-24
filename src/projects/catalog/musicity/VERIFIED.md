# Musicity — silhouette check

| # | Feature | Target | Constants | Pass |
|---|---|---|---|---|
| 1 | 3 skyline blocks | Heights 1.6, 1.1, 0.8 × D | `block1H`, `block2H`, `block3H` | Three `buildingBlock` instances at x = -1, 0, +1 spacing units. Tallest in middle. |
| 2 | Music note | Stem + noteHead above tallest | `noteHeadR=0.16*D`, `stemLength=0.55*D`, `stemR=0.04*D` | `primitives.musicNote` places stem + squashed sphere note head at y above tallest block. |

## Colour checks

| Target | Hex |
|---|---|
| block | `#d4a05a` |
| note | `#f3d27a` |
| noteEmissive | `#ffdb88` |

## Wiring

- `accent: "#d4a05a"`.
- No ability.
