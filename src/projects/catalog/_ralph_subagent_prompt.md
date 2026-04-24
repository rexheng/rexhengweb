# Ralph — per-project subagent prompt

You are a focused subagent. You will build **one** catalog sprite from
start to commit. Do not touch any other project.

## Your blast radius

You may create or edit files **only** under:

    C:/Users/Rex/Desktop/Work/Projects/rexhengweb-catalog/src/projects/catalog/{{ID}}/

You MAY NOT touch:
- `src/main.js`
- `src/projects/index.js` — the glob picks up your new folder automatically
- `src/projects/system.js`
- `src/projects/abilities/*` — the shared ability registry. If your sprite
  needs a new ability, write it to `catalog/{{ID}}/_local_ability.js` and
  import it locally from your `index.js`. Leave a note in `STATUS.md` that
  it's a candidate for promotion to `abilities/` if reused.
- `src/projects/builders/*` — shared primitives / materials. Same rule: if
  you need a new primitive, write it to
  `catalog/{{ID}}/_local_primitives.js` and use it locally.
- `assets/scenes/humanoid.xml`
- `scripts/`

If you feel blocked and need to touch any of those, STOP and write a
`catalog/{{ID}}/BLOCKED.md` describing the specific blocker and what
you'd need to proceed. Do not partial-commit.

## Inputs

You receive a metadata blob with:
- `id` — slug, used as folder name and `def.id`.
- `label` — short display name.
- `title` — full title (e.g. "Neo-Riemannian Explorer — chord visualiser").
- `tags` — array of strings from the card's `.project-tag` list.
- `card_description` — the paragraph from `projects/index.html` card. THIS
  IS THE ABSTRACT you use for `def.description` — copy it verbatim (or
  lightly edit for length, never rewrite the voice).
- `card_link` — the `href` from the card's "View Project" link.
- `accent` — suggested accent colour (hex). You may override.
- `sprite_role` — one of: "prop", "character", "vehicle", "landmark",
  "terrain".

## The 7-step workflow

Execute in order. Commit only at the end, as one atomic commit.

### 1. Brief (`BRIEF.md`)
One-line project summary. Link to the card on projects/index.html (or
write "none" if the project isn't on the page). Sprite role. 2-3 bullets
on what visual target you're going to hit.

### 2. Refs
Fetch 3-5 reference images. Strategy:
- Try Wikimedia Commons first (public domain / CC):
  `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch={query}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|mime|size`
- If the project has a website (`card_link`), fetch its meta tags / hero
  image URL.
- If the project has a GitHub repo, fetch the README's first image.

You CANNOT download binary files in this environment. Instead:
- Write `REFS.md` listing each ref's source URL + what it shows + any
  colour hexes you sampled by reasoning about the image.
- Note in `REFS.md` that `refs/*.png` are intentionally absent.

**Do not block on refs.** If Wikimedia returns nothing and the project
has no site, work from your prior knowledge of the subject. Document
the fallback in `REFS.md`.

### 3. Decompose
Write a comment block at the top of `proportions.js` breaking the
silhouette into primitive blocks ("base = disc 1.3×D, shaft = lathe
1.0×D × 5×D, …").

### 4. Proportions (`proportions.js`)
Pure constants. `export const D = 0.26;` then `export const SIZES = {...}`
with every dim as a multiple of D, and `export const COLOURS = {...}`
with hexes. **No THREE imports, no logic.**

### 5. Build (`build.js`)
Pure DI. The export is:
```js
export function buildMesh({ THREE, materials, primitives, proportions }) { ... }
```
- Read every number from `proportions.SIZES`, every colour from
  `proportions.COLOURS`.
- Call shared `primitives.*` factories when you can (tictac, ringBand,
  stubLeg, flutedColumn, abacus, flaredFrustum, disc). Need something
  new? Write it to `_local_primitives.js` and import locally.
- No inline magic numbers. No inline hex strings.

### 6. Silhouette check (`VERIFIED.md`)
Write a table mapping each target silhouette feature (from your brief)
to the specific proportion constants that deliver it. No pixel-diff
available — written reasoning is the gate.

### 7. Wire (`index.js`)
```js
import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";
// import { myAbility } from "./_local_ability.js"; // only if local

export default {
  id: "{{id}}",
  label: "{{label}}",
  title: "{{title}}",
  subtitle: "...",                   // your call; year + one-line
  meta: "...",                       // tech stack ("three.js · procedural")
  accent: "{{accent}}",
  description: "{{card_description verbatim}}",  // THE ABSTRACT — not a sprite description
  links: [{ label: "View Project", href: "{{card_link}}" }],
  abilityLabel: "...",
  ability: "stab" | "topple" | null,  // string key from ABILITIES; null if no ability
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
```

## Content rule (important, overrides anything else)

`description` is a PROJECT ABSTRACT. It says what the project is, what it
does, what tech stack. It does NOT describe the 3D sprite's geometry,
materials, or animation.

Source priority for description:
1. `card_description` verbatim (or lightly edited).
2. GitHub README opening paragraph.
3. Linked site's meta description.

Do not write "rounded torso, cyan visor, two stub legs" — that's the
anti-pattern. The Amogus rebuild explicitly corrected this.

## Validation check before you commit

Run this in the catalog worktree to make sure your def loads cleanly:

```bash
cd C:/Users/Rex/Desktop/Work/Projects/rexhengweb-catalog/
node --check src/projects/catalog/{{id}}/build.js
node --check src/projects/catalog/{{id}}/proportions.js
node --check src/projects/catalog/{{id}}/index.js
```

Each must exit 0. If any fails, fix your code before committing.

## Commit

One atomic commit, message format:

```
catalog({{id}}): add {{label}} sprite

[One paragraph: what the sprite is, what proportions you used, what
ability it fires (if any), what references you pulled.]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Update STATUS.md

Create `src/projects/catalog/STATUS.md` if it doesn't exist. Append a
table row for your project:

```md
| {{id}} | {{label}} | built | YYYY-MM-DD | ability={{ability|null}} | notes |
```

Status values:
- `built` — all 7 steps done, committed, loads cleanly.
- `blocked` — wrote BLOCKED.md, no commit.
- `needs_refs` — committed with placeholder refs / proportions, needs an
  image-capable pass to tighten.

## If you get blocked

Write `catalog/{{id}}/BLOCKED.md` with:
- The specific blocker ("can't determine sprite silhouette for a music
  theory web app" / "ability physics unclear" / "proportions can't read
  the silhouette without a visual render" / …).
- What unblocks you (a user decision, an image-capable pass, a new
  primitive shared across projects, …).

Do not partial-commit. Exit with the BLOCKED.md as the record. The outer
loop will log and move on.
