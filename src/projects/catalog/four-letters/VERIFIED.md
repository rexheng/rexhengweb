# Four Letters — silhouette check

| Feature | Target | Delivered by |
|---|---|---|
| 4×4 grid | Tiles arranged in a square, visible gaps | `GRID=4` with nested loop, `tileGap=0.04*D` between tiles |
| Tile shape | Cube-ish, slightly flatter than a cube | `tileSize=0.32*D` × `tileHeight=0.22*D` — height ~70% of width |
| Two-colour tiles | Cream top, orange sides — Scrabble feel | Per-face material array: topMat = `#f5ead2`, sideMat = `#d47a42` |
| Base plate | Dark tray under the tiles | baseSide = gridSide + 2·`basePadding` = 1.56*D; gridBase material `#1a1512` |
| Branding | "REX " spelled across row 1 | `LETTERS[0..2] = "R","E","X"` + letter plates with per-letter scale/rotation so the three filled tiles read as different letters |
| Blank tiles | Remaining 13 tiles have no letter plate | Empty-string entries in LETTERS skip the plate — silhouette stays readable as a word-search grid, not just a Rex-branded sign |

## Judgment calls

- No font asset available to draw real letters; used per-letter scale +
  rotation hacks (R wider, E narrower, X rotated 45°) so the three
  filled tiles are distinguishable from each other. Sufficient for a
  "letter tile, not blank" read. A future pass with a text-to-mesh
  helper (e.g. THREE's TextGeometry + a loaded font) can replace this.
- No ability — word-search doesn't map to a physics gag.
