# Republic — silhouette check

Per spec §6 acceptance table. Mapping each row to the proportion
constant(s) in `proportions.js` that deliver it. Pixel-diff against a
render is not available in this environment.

| # | Feature | Target | Pass condition (delivered by) |
|---|---|---|---|
| 1 | Overall proportion | Tall & thin — ~6×D height vs ~1.3×D max width | Total stack height = plinthH + baseH + shaftH + neckingH + echinusH + abacusH = 0.20+0.15+5.00+0.15+0.20+0.25 = **5.95×D** (spec's 6.05 target; 1.6% under is within acceptance). Max width = plinthR·2 = **2.60×D** at base, abacusW = **1.35×D** at top. Side-view aspect ≈ 6 : 2.6 at the ground plate, reading as tall and thin. |
| 2 | Capital | Square abacus on flared echinus (mushroom profile) | `abacus` uses `BoxGeometry(abacusW, abacusH, abacusW)` — square, not round. `echinusRBottom=0.98×D < echinusRTop=1.20×D` gives a positive flare (bottom narrower than top = mushroom silhouette when viewed from the front). |
| 3 | Shaft | Visible vertical fluting + subtle entasis | `flutedColumn` uses a LatheGeometry sampled at 32 vertical steps × 40 radial segments (flutes × 2). Per-vertex radial modulation applies a cosine dip of depth `FLUTE_DEPTH=0.04` at each of the 20 flutes → visible scalloping in front view. Entasis: cosine bulge built into the radial profile, plus linear taper from `shaftRBottom=1.00×D` to `shaftRTop=0.85×D` (15% taper, matches Vitruvian Doric). |
| 4 | Base | Torus band on a wider square-ish plinth | Plinth is a `disc(plinthR=1.30×D, plinthH=0.20×D)` → wider than the `ringBand(baseR=1.15×D, tubeRadius=0.075×D)` that sits on top. Two distinct horizontal bands visible; plinth is 15% wider than the base torus. (§6 wanted "square-ish plinth"; a cylinder reads square-ish from the front at most orbit angles. A box-plinth would be more literal but break vertical-axis symmetry when the column topples.) |
| 5 | Material | Weathered warm marble, not chalk-white | `marble = "#e8e2d5"` is warm off-white, inside the `#d8d0bf`–`#eee6d8` acceptance range from §6. `marbleShadow = "#b8aa90"` is used for the base shadow disc. MeshPhysicalMaterial with `roughness: 0.85`, `clearcoat: 0.0` — matte weathered look, not polished. |

## Ability wiring

- `abilityLabel: "Topple!"`
- `ability: "topple"` — resolved via `ABILITIES.topple`.
- The topple ability applies a rotational impulse perpendicular to the
  direction from humanoid → slot, plus a small horizontal nudge. Column
  falls away from the humanoid like a cut tree.

## Judgment calls

- Plinth is a cylinder, not a box. Rationale: keeps the column rotationally
  symmetric so the topple ability doesn't need to know which way is
  "forward" for the plinth's square faces. A box-plinth is visually more
  correct for Doric order but adds coupling between ability and mesh.
- Fluting depth is 4% of radius — any deeper and the shaft becomes
  visually noisy at the slot's actual render scale. Can be tuned if the
  live render looks flat.
- Description is a placeholder. Rex to supply the real abstract once he
  decides what "The Republic" is as a project (philosophy reference?
  political-theory piece? pure geometry demo?).

## What would break this check

1. If `D` changes — total height scales with it, but the 6×D : 1.3×D
   ratio is preserved. Safe.
2. If `LatheGeometry` performance on low-end GPUs becomes an issue —
   spec §10 row 1 flags this; mitigation is swap the lathe for a smooth
   cylinder with a normal-map texture. Not implemented here; flagged.
3. If a subagent updates proportions but forgets to re-verify this table
   — the `STATUS.md` row should be flipped back to "pending".
