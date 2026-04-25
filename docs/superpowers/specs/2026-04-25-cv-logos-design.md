# CV Icons & Logos — Design Spec

**Date:** 2026-04-25
**Branch:** mujoco-portfolio
**Scope:** `cv/index.html` + new `cv/logos/` directory

---

## Goal

Add organisation and project logos to the CV page. Work/education entries get a logo in the left meta column; project cards get an organiser logo inline in the title row. All logos are self-hosted SVGs. Remove the Attic project card.

---

## Asset Inventory

| File | Organisation | Source |
|---|---|---|
| `cv/logos/lse.svg` | London School of Economics | Wikimedia Commons |
| `cv/logos/raffles.svg` | Raffles Institution | Brandfetch |
| `cv/logos/dbs.svg` | DBS Bank | Wikimedia Commons |
| `cv/logos/pwc.svg` | PricewaterhouseCoopers | Wikimedia Commons (2025 logo) |
| `cv/logos/saf.svg` | Singapore Armed Forces | https://en-academic.com/dic.nsf/enwiki/449970 |
| `cv/logos/cursor.svg` | Cursor | cursor.com/brand |
| `cv/logos/hedera.svg` | Hedera | hedera.com/brand |
| `cv/logos/sig.svg` | Susquehanna International Group | Brandfetch / sig.com |
| `cv/logos/manus.svg` | Manus AI | manus.im/brand |
| `cv/logos/claude.svg` | Anthropic / Claude | Simple Icons / Wikimedia Commons |
| `cv/logos/phala.svg` | Phala Network | Polkassets / phala.network |
| `cv/logos/ethereum.svg` | Ethereum (for ETH Oxford) | Simple Icons |

**Skipped (no reliable SVG):** Cambridge Consulting Network, Blackfriars Settlement, Hack London, Encode Club.

---

## HTML Changes

### Entry-meta logos (work & education)

Add an `<img class="entry-logo">` as the last child of `.entry-meta`, after the `.place` span. Only entries with a logo get the element — no placeholder for skipped orgs. Omit the `width` attribute; CSS `width: auto` handles proportional scaling from the fixed height.

```html
<div class="entry-meta">
  <span class="dates">2024 — 2027</span>
  <span class="place">London</span>
  <img class="entry-logo" src="logos/lse.svg" alt="London School of Economics" height="32" loading="lazy">
</div>
```

Mapping:
- LSE → `lse.svg`
- Raffles Institution → `raffles.svg`
- DBS Bank → `dbs.svg`
- PwC → `pwc.svg`
- Singapore Armed Forces → `saf.svg`
- Cambridge Consulting Network → (omitted)
- Blackfriars Settlement → (omitted)

### Project card logos

Add an `<img class="pc-logo">` as the first child of `.pc-head`, before `.pc-title`. `.pc-logo` uses `align-self: center` to override the parent's `align-items: baseline` — replaced elements use their bottom edge as the baseline, which would misalign the logo against the title text.

```html
<div class="pc-head">
  <img class="pc-logo" src="logos/cursor.svg" alt="Cursor" height="18" loading="lazy">
  <h3 class="pc-title">Amogus</h3>
  <span class="pc-meta">2nd · Cursor Hack 2026</span>
</div>
```

Mapping:
- Amogus → `cursor.svg`
- Peel → `hedera.svg`
- Olympic Way Interchange → `sig.svg`
- Landmark → (omitted — Hack London, no reliable SVG)
- Manusman → `manus.svg`
- Outreach → `claude.svg`
- ClearPath → (omitted — Claude is the tool used, not the event organiser; Outreach uses `claude.svg` because Anthropic/Claude ran that hackathon)
- Arrow → `phala.svg`
- The Republic → `ethereum.svg`
- Neo-Riemannian Explorer → (omitted — personal project)
- MusiCity → (omitted — personal project)
- Four Letters → (omitted — personal project)

### Attic removal

Delete the Attic project card `<article class="project-card reveal">` entirely from the projects grid.

---

## CSS Additions

```css
/* ─── Entry logos ─── */
.entry-logo {
  display: block;
  height: 32px;
  width: auto;
  margin-top: 12px;
  filter: grayscale(1) opacity(0.55);
  transition: filter 240ms ease;
}
.entry:hover .entry-logo {
  filter: grayscale(0) opacity(1);
}

/* ─── Project card logos ─── */
.pc-logo {
  display: block;
  height: 18px;
  width: auto;
  flex-shrink: 0;
  align-self: center;
  filter: grayscale(1) opacity(0.5);
  transition: filter 220ms ease;
}
.project-card:hover .pc-logo {
  filter: grayscale(0) opacity(1);
}
```

---

## Loading Strategy

- Native `loading="lazy"` on all logo `<img>` tags — no JS required, broadly supported. Note: the LSE logo (first entry, likely in the initial viewport) will be treated as eager by browsers regardless.
- `width` attribute omitted from `<img>` tags; CSS `width: auto` handles proportional scaling.
- **CLS prevention:** each downloaded SVG file must have explicit `width` and `height` attributes on its `<svg>` root element. Browsers cannot reserve horizontal space from a `height`-only `<img>` when the SVG has no intrinsic dimensions — the layout slot stays zero-width until the file loads. Strip or set `width`/`height` on the SVG root when saving each file.
- All files self-hosted under `cv/logos/` — no external CDN dependency, no CORS issues.

---

## Print

Add a `filter: none` reset for both logo classes inside the existing `@media print` block, so logos render at full opacity and colour rather than at the resting 55%/50% opacity greyscale:

```css
@media print {
  .entry-logo, .pc-logo { filter: none; }
}
```

---

## Out of Scope

- No JS lazy-loading library (IntersectionObserver) — native `loading="lazy"` is sufficient for static images this small.
- No WebP/AVIF conversion — SVGs are already optimal for logos.
- No dark-mode variant — the CV is light-mode only.
