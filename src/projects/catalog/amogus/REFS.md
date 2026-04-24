# Amogus — references

## Status

Reference image files are NOT committed to `refs/` in this worktree — the
sandboxed agent environment can fetch text via WebFetch but cannot download
binary PNG/JPG files. Each reference below is documented by its Wikimedia
Commons URL; a human or a subagent with image-download access can mirror
them into `refs/` later without changing the proportions or the build.

The rebuild in `proportions.js` reasons from the canonical silhouette that
these references document, plus Rex's memory of the character.

## Refs

| # | Filename (intended) | Source URL | What it shows | Notes |
|---|---|---|---|---|
| 1 | `refs/front.png` | https://upload.wikimedia.org/wikipedia/commons/a/ac/AmongUs_CrewsonaSeven.png | Full front view of seven crewmates in all canon colours. Primary silhouette reference. | 2000×1743 PNG, CC-licensed on Wikimedia Commons. Use the red one on the far right for body hex. |
| 2 | `refs/cosplay.jpg` | https://upload.wikimedia.org/wikipedia/commons/9/9a/Pyrkon_2022_-_Among_Us_cosplay.jpg | Convention cosplay showing a real 3-D interpretation of the silhouette. Side view readable. | Documents that the backpack profile is roughly half the torso's back-to-front depth. |
| 3 | `refs/skins.jpg` | https://upload.wikimedia.org/wikipedia/commons/2/2f/Among_Us_skins_cosmetics.jpg | Official in-game skin menu — every canon colour in a grid, showing visor shape and frame at different angles. | 576×576. Visor is the cleanest reference here. |
| 4 | `refs/logo.svg` | https://upload.wikimedia.org/wikipedia/commons/a/ac/Among_Us_Logo.svg | Official Among Us wordmark with a single crewmate replacing the "A". | Vector source — use for body-stroke colour (darker red). |

## Colour swatches (documented, not sampled)

Sampled from the Wikipedia article body + common community references.
The red crewmate's canonical palette is:

| Token | Hex | Source |
|---|---|---|
| body | `#c51111` | Official InnerSloth palette for "Red". The previous `#d94a52` in build.js was arbitrary — this is the canon colour. |
| bodyShadow | `#7a0e0e` | ~50% value of body, used for the ground-contact rim and the dark underside. |
| visorGlass | `#9acdd6` | Skin menu reference — slightly cooler than the old `#7ad5e0`. |
| visorFrame | `#2a3844` | Unchanged — reads as darkened interior of the helmet. |
| backpackTrim | `#a00d0d` | Slight shadow band where the pack meets the body. |

## Canonical dimensions (from the refs)

Among Us doesn't publish a spec sheet. The community-accepted proportion is:

- Body: width ≈ 1 unit, height ≈ 2.4 units, flat-bottomed capsule.
- Visor: ~60% of face width, ~30% of body height, centred on the upper third.
- Legs: each ~40% of body width, ~20% of body height, planted wide apart at
  the base (outer edges align with the body's widest point).
- Backpack: ~70% of body width, ~55% of body height, sitting behind the
  body with ~30% of its depth clipping into the body curve.

These are the numbers `proportions.js` encodes below.
