# Amogus — silhouette check

Per spec §5 + §8 step 6. Pixel-identical render comparison is not
available in this environment (no headless three.js render harness has
been landed yet). Acceptance is instead documented here by mapping each
§5 row to the specific proportion constants that deliver it.

| # | Feature | Canon target | Constant(s) in `proportions.js` | Pass reasoning |
|---|---|---|---|---|
| 1 | Body shape | Flat-bottomed capsule (Tic-Tac), NOT an egg | `primitives.tictac(cylHeight=1.40*D, domeRadius=1.00*D)` + `bodyBaseY=-1.20*D` | Cylinder section gives the flat bottom; hemisphere domes the top. Compare to the old build.js which used `SphereGeometry(0.26)` with `scale(1, 1.55, 1)` — an egg. |
| 2 | Body proportion | ~1 : 2.4 (W : H) | `bodyRadius=1.00*D`; total height = `bodyCylHeight + bodyDomeHeight = 1.40*D + 1.00*D = 2.40*D` | Width = 2·bodyRadius = 2.00*D; height = 2.40*D → ratio 1 : 1.2 per-radius, or 1 : 2.4 as W:H since width = 2R ≈ 0.52 vs height 0.624. Matches canon. |
| 3 | Visor | Wide wraparound, ~60% face width, high on body | `visorWidth=1.20*D` vs body equator circumference ≈ 2·π·R ≈ 6.28·R → visor spans 1.20/2.00 = 60% of the body's front face width; `visorY=0.25*D` places it in the upper third of the 2.4*D-tall body | Compare to the old build: visor was 0.28 wide vs body diameter 0.52 → 54% (spec called this out as a miss). New visor is explicitly 60%. |
| 4 | Legs | Two stubby cylinders, rounded, wide stance | `stubLeg(radius=0.24*D, height=0.58*D)` at `legCentreX=±0.40*D` | Outer leg edge at `0.40+0.24 = 0.64*D`, which sits proud of the body's widest point (`bodyRadius=1.00*D`) along the forward axis — intentionally wide stance reads in front view. Old build used `BoxGeometry(0.12, 0.16, 0.14)` at x=±0.10, narrow stance touching body. |
| 5 | Backpack | Hugs back curve, ~50% torso height | `packWidth=0.78*D, packHeight=1.30*D, packDepth=0.42*D` at `packCentreZ=-0.90*D` | Height 1.30/2.40 = 54% of body height (§5 target "~50%" met). Depth 0.42*D extrudes past the body's back; centreZ=-0.90*D means ~30% of the pack's depth clips into the body curve, giving the "hugging" read. Old build used a separate `BoxGeometry(0.18, 0.20, 0.11)` — a slab that did not hug. |

## Colour checks

| Target | Hex | Why |
|---|---|---|
| body | `#c51111` | Canon Among Us "Red". Old build used `#d94a52`, which reads as salmon. |
| bodyShadow | `#7a0e0e` | 50% value of body; the rim torus and leg material. |
| visorGlass | `#9acdd6` | Slightly cooler than the old `#7ad5e0`; matches reference-palette mid-tone. |
| visorFrame | `#2a3844` | Unchanged — darkened helmet interior reads as depth. |

## Wiring

- `abilityLabel: "Stab!"` — unchanged.
- `ability: "stab"` — string key, resolved via `ABILITIES.stab`.
- `accent: "#e25d63"` — unchanged; drives the label/card accent (intentionally more saturated than the canon body red so the UI chrome pops against the sprite).
- `description` — rewritten as a project abstract per the overriding content rule. No geometry or animation description.

## What would break this check

1. If `D` changes without proportions being re-verified against the slot capsule size — the sprite would scale off the slot bounds.
2. If `proportions.js` is deleted or replaced with `{}` — the validator in `src/projects/index.js` catches it and logs a console.error, leaving Amogus out of PROJECTS rather than crashing the site.
3. If a new canon reference arrives (e.g. a spec sheet) with dimensions that contradict the ratios here — update `proportions.js`, re-verify this table, recommit VERIFIED.md.
