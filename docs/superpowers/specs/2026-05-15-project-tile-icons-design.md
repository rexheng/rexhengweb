# Project Tile Icons — Design

Date: 2026-05-15
Status: Approved, ready for implementation plan

## Problem

The projects panel renders each project as a tile: a muted-pastel swatch
with a generated 2-letter monogram (`AM`, `AR`, `CP`, ...). Eleven tiles of
two-letter abbreviations read as a spreadsheet, not an identity. Each project
should have its own recognizable glyph while staying inside the panel's
editorial-mono aesthetic.

## Decisions (locked during brainstorming)

- **Style: Option A, hairline stroke glyph.** Single stroke, no fill,
  echoing the panel's existing hairline rules. Chosen over a serif sigil (B)
  and a filled silhouette (C).
- **All 11 projects get custom glyphs.** `cv/logos/` is left untouched. Those
  are affiliation/sponsor marks (NHS, Hedera, Phala, SIG, Cursor, Encode),
  not project identities; mixing them in would break the unified system and
  misuse third-party trademarks.
- **Gemini app, not API.** Image generation runs in the Gemini app under the
  existing Gemini Pro subscription (the API key's project has no image
  billing; image generation has no free tier). The Gemini output is a
  **reference only**. Every committed asset is a hand-traced SVG, so
  cross-icon consistency is enforced by the SVG, not the model.
- **No image-gen MCP.** The MCP investment was deferred: it only pays off
  with API billing enabled, which this workflow does not need.

## Visual Spec

The tile and swatch are unchanged structurally. Only the swatch's content
changes from text to an inline SVG.

- Swatch: existing size (30×30, 34×34 mobile), existing `border-radius: 3px`,
  existing muted-pastel `var(--accent)` background. No change.
- Glyph: inline `<svg viewBox="0 0 24 24">`, single `<path>` (or minimal
  paths), `fill: none`, `stroke: var(--rex-ink)`, `stroke-width: 1.4`,
  `stroke-linecap: round`, `stroke-linejoin: round`.
- Rendered glyph size inside the swatch: 18×18 (matching the preview), so the
  stroke reads at roughly the same visual weight as the current monogram.
- Hover/active states inherit the existing swatch behaviour
  (`filter: brightness(1.15)` on hover); no glyph-specific state.
- Dark-on-pastel contrast is identical to the current monogram because the
  stroke uses the same `var(--rex-ink)` the monogram text uses.

## The 11 Glyphs

| id | label | glyph subject |
|---|---|---|
| amogus | Amogus | crewmate silhouette (body + visor), outline only |
| arrow | Arrow | arrow passing through a shield (TEE / secure inference) |
| clearpath | ClearPath | forward waypoint chevrons along a cleared path |
| musicity | Musicity | eighth note whose stem rises into a small skyline |
| oliver-wyman | Oliver Wyman Datathon | regression line through scatter points |
| olympic-way | Olympic Way | transit node (ringed dot) on a graph edge |
| outreach | Outreach | concentric reach rings radiating from a single figure |
| peel | Peel | a curling citrus peel spiral |
| peter-network | Peter Network | linked nodes whose edges trace a "P" |
| republic | Republic | classical column with a simple pediment |
| simulacra | Simulacra | nested mirrored faces (recursion, two or three deep) |

Each must read as a 18px outline. No interior detail finer than the 1.4px
stroke can carry. Where a subject is too busy (skyline, scatter), the trace
simplifies to the fewest strokes that still signify.

## Storage and Wiring

- Each `src/projects/catalog/<id>/index.js` gains an optional `icon` field:
  a string of SVG **inner markup** (the `<path>`/`<g>` content, not the
  outer `<svg>` wrapper). The wrapper, viewBox, stroke attributes are applied
  by `controlsPanel.js` so every glyph is guaranteed identical stroke
  treatment.
- `src/projects/index.js` validation: if `icon` is present it must be a
  non-empty string. Absent is valid (falls back to monogram).
- `controlsPanel.js` `_projectGrid()`: when `def.icon` is a non-empty string,
  build an `<svg>` element with the fixed wrapper attributes and set its
  inner HTML to `def.icon`; otherwise keep the current
  `swatch.textContent = this._monogram(def)` path.
- No build step, no `import.meta.glob`, no fetch. This matches the existing
  explicit-import registry exactly.
- Incremental migration is safe: a project without `icon` still renders its
  monogram, so the grid is never broken mid-migration.

## Generation Workflow

1. Rex pastes the master style prompt + one subject line into the Gemini app,
   per project (or batched).
2. Rex downloads the PNGs into a scratch folder `cv/logos/projects/`. These
   are tracing references, not shipped assets; the folder is deleted once all
   11 SVGs are traced and verified. Nothing in `cv/logos/projects/` is
   committed.
3. Rex signals which projects are ready.
4. Claude traces each PNG into a clean single-stroke SVG path, normalizes it
   to the 24×24 viewBox / 1.4px-stroke spec, pastes the inner markup into the
   matching catalog def's `icon` field.
5. Claude verifies the live panel at `http://localhost:8765` (dev server is
   always on 8765) and screenshots the grid for review.

### Master style prompt (paste into Gemini app)

> Minimalist line-art icon, single continuous thin stroke, uniform 2px
> stroke weight, no fill, no shading, no color, pure black stroke on a plain
> white background, centered, generous margin, 1:1 square, simple geometric
> construction, rounded line caps and joins, flat 2D, no perspective, no
> 3D, no gradient, no texture. The icon depicts: **{SUBJECT}**. Keep it
> readable at very small sizes — minimum number of strokes, no fine interior
> detail.

`{SUBJECT}` is replaced per project with the subject text from the table
above (e.g. "the Among Us crewmate silhouette: rounded body with a single
oval visor and two short leg stubs").

## Out of Scope

- Image-gen MCP server (deferred until API billing exists).
- Any change to `cv/logos/` or the CV page.
- Animated or stateful glyphs.
- Replacing the monogram fallback (kept permanently as the no-icon default).

## Success Criteria

- All 11 catalog defs carry an `icon` field; the grid shows 11 distinct
  outline glyphs, none rendering a monogram.
- Each glyph is legible as a dark stroke on its pastel swatch at the real
  30px tile size, desktop and mobile.
- A hypothetical 12th project with no `icon` still renders its monogram with
  no error.
- Stroke weight is visually identical across all 11 (enforced by the shared
  wrapper, not per-file).
