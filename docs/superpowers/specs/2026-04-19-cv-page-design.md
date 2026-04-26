# Design: Self-Contained CV Page + Playground Entry Point

**Date:** 2026-04-19
**Status:** Draft (awaiting review)
**Author:** Rex (w/ Claude)

## Problem

The current site lands visitors on the MuJoCo physics playground (`index.html`). It's fun but hostile to the two audiences that matter most for a portfolio site: **recruiters** and **AI scrapers** (ChatGPT, Perplexity, Google AI overviews, LinkedIn/ATS parsers). They need text-first, fast-loading, semantically structured content. The playground gives them a WASM blob and a 3D scene.

Goal: add a clearly-marked escape hatch from the playground to a clean, professional, AI/SEO-optimised CV page — with an equally clear way back to the playground.

## Scope

**In scope:**
1. New self-contained page at `/cv/index.html` — single-page HTML CV mirroring `resume-2026-04-18.tex`.
2. Top-right pill button on the playground that links to `/cv/`.
3. "Back to playground" link in the CV page's nav.
4. Remove the MetricsHud from the playground (frees the top-right corner and cleans up UI).

**Out of scope:**
- Fixing the orphaned `/projects/`, `/experience/`, `/writing/` pages (they reference a missing `../style.css`). Leave as-is.
- Rebuilding or flipping the default entry point. Playground remains at `/`.
- Changing the playground's left-side `RH` portfolio overlay.
- Contact form, writing samples, or any content beyond what the resume contains.

## Architecture

Three files touched, one file created, one file deleted.

```
rexhengweb/
├── index.html                    (playground — unchanged)
├── cv/
│   └── index.html                NEW — self-contained CV page
├── src/
│   ├── main.js                   MODIFY — remove MetricsHud init, add CV pill button
│   ├── metricsHud.js             DELETE (after confirming no other imports)
│   └── ui.js                     MODIFY — remove MetricsHud CSS, add CV pill CSS
```

**Why self-contained CV page**: The existing `/projects/`, `/experience/`, `/writing/` pages all `<link>` to `../style.css`, which lives only in `_old/` — so they're currently broken when served from root. Rather than inherit that broken plumbing, `/cv/index.html` inlines all its CSS in a `<style>` block. No external stylesheet dependencies, no module imports, no JS needed. One file, one request, fully indexable.

## CV Page Content Structure

Source of truth: `C:\Users\Rex\Desktop\Work\Projects\resume\resume-2026-04-18.tex`.

Sections, in order:
1. **Header** — `<h1>Rex Heng</h1>` + contact row (phone, email, LinkedIn)
2. **Education** — LSE (BSc PPE, 2024-2027, First-Class Honours first year) + Raffles Institution
3. **Professional Experience** — DBS Bank, Cambridge Consulting Network, PwC
4. **Extra Curricular Activities** — Amogus (Cursor Hack 2nd place), Peel (Hedera), London Intervarsity Case Competition, Olympic Way Interchange (1st place Datathon), Landmark (Hack London), Blackfriars Settlement, MBP Capital
5. **Skills** — Programming, Frameworks, AI & Data, Web3, Languages & Interests

Each role/activity entry:
```
<article class="entry">
  <header class="entry-head">
    <div class="entry-title"><h3>Organisation</h3><span class="dates">Jul 2025 – Present</span></div>
    <div class="entry-role"><em>Role · Subteam</em></div>
  </header>
  <ul class="bullets"><li>...</li></ul>
</article>
```

Bullet text is copied verbatim from the `.tex` file, with LaTeX escapes converted (`\$` → `$`, `--` → `–`, `\&` → `&`, `$\times$` → `×`, URLs unescaped).

## SEO / AI-Scraper Optimisations

Applied deliberately — these are the whole point of the page:

1. **`<title>`**: `Rex Heng — PPE at LSE, ESG Risk Specialist at DBS | CV` (primary keywords: name, degree, school, current role, page type).
2. **Meta description**: 155-char summary with name, role, degree, one signature achievement.
3. **JSON-LD structured data**: `<script type="application/ld+json">` with `@type: Person`, including `name`, `jobTitle`, `affiliation`, `alumniOf`, `email`, `url`, `sameAs` (LinkedIn). This is what ChatGPT/Perplexity/Google Knowledge Graph parse.
4. **Semantic HTML**: `<main>`, `<article>` per role, `<section>` per top-level group, `<time datetime>` on dates, `<h1>`-`<h3>` hierarchy with no skipped levels.
5. **OpenGraph + Twitter cards**: so LinkedIn/X link previews render cleanly.
6. **No JS required to render content**: every word is in the initial HTML. Zero client-side fetching.
7. **`prefers-color-scheme` media query only** — no JS theme switcher.

## Visual Style (Option B — light serif, matching `/projects/` guideline)

Inlined CSS. Design tokens chosen to echo `/projects/index.html` without importing its broken stylesheet:

```
--bg: #fdfbf7           (warm off-white, matches editorial feel)
--text: #1a1d24         (near-black, high contrast for readability)
--text-muted: #5a6070   (grey for dates, meta)
--accent: #6b8e6f       (medium-green, echoes /projects/ "var(--medium-green)")
--rule: #d6d3cc         (hairline dividers)
--max-width: 820px      (optimal CV reading width)

Headings: 'Times New Roman', Times, serif (matches existing pro pages)
Body: system-ui sans serif (better on-screen readability than Times)
Dates & tags: ui-monospace, SFMono-Regular, Consolas, monospace (subtle technical signal)
```

Layout: single centered column, generous whitespace, hairline rules between major sections, bullet entries indented with subtle left-border accent on hover. Fully responsive (mobile breakpoint at 640px collapses date+title to single line).

Print-ready: `@media print` block hides the nav and "Back to playground" link, tightens spacing, forces white background. Someone Ctrl+P'ing the page gets a clean printed CV.

## Entry & Exit Points

**Playground → CV (top-right pill button):**
```
<a class="rex-cv-link" href="/cv/">View CV →</a>
```
- Fixed position, top-right, ~16px margin from edges.
- Same design language as the existing `RH` toggle in the top-left: semi-transparent dark pill, light text, amber hover accent, same border-radius, same font-family.
- Added by `src/main.js` during init (same place `MetricsHud` is being removed).
- CSS in `src/ui.js` alongside the existing `.rex-ui-*` styles.

**CV → Playground (nav link):**
- CV page header contains a single nav row: `← Back to playground` on the left, `Rex Heng` centered or with initials.
- Small, unobtrusive, but always visible via `position: sticky; top: 0`.

## MetricsHud Removal

Remove the entire `MetricsHud`:
1. Delete `src/metricsHud.js` after confirming no other file imports it (expected imports: `src/main.js` only).
2. Remove `import { MetricsHud } from "./metricsHud.js"` from `src/main.js`.
3. Remove the `this.metricsHud = new MetricsHud(...)` instantiation and any `this.metricsHud.update(...)` calls from the animate loop.
4. Remove MetricsHud-related CSS from `src/ui.js` (any `#rex-metrics-*` or `.rex-metrics-*` rules).

Rationale: frees the top-right corner for the CV pill, simplifies the UI, and the per-frame metrics aren't useful to any visitor — they were dev-time instrumentation.

## Testing

**Visual verification (required — user asked for it explicitly):**
After implementation, start a local server (check for existing dev server first on `:3000` / `:5173` / `:8000` via `netstat`; ask which port if multiple), then use Playwright MCP to:
1. Navigate to `http://localhost:<port>/` — confirm playground loads, top-right shows `View CV →` pill, top-right no longer shows the MetricsHud panel.
2. Click the pill — confirm navigation to `/cv/`.
3. Confirm CV page renders: H1 = "Rex Heng", visible sections (Education, Professional Experience, Extra Curricular Activities, Skills), all bullet text present, light/serif styling.
4. Click "← Back to playground" — confirm return to `/`, playground re-initialises.
5. Check mobile viewport (375×667) — confirm no horizontal scroll, readable typography.
6. View page source — confirm JSON-LD block present, meta description present, H1/H2/H3 hierarchy valid.
7. Take screenshots of both pages for the user to eyeball.

**No unit tests needed** — this is a static HTML page + two small JS edits. Playwright-driven smoke test is sufficient.

## Risks & Tradeoffs

| Risk | Mitigation |
|---|---|
| Resume content drifts between `.tex` and `/cv/index.html` | Accepted. Web page is snapshot as of 2026-04-19. Updating requires re-editing HTML when resume changes — documented in page footer comment. |
| `/cv/` URL conflicts with existing routing | Checked: no existing `cv/` directory, no Vercel rewrite rules touching it. |
| MetricsHud deletion breaks something that imports it | Grep for `metricsHud` / `MetricsHud` across `src/` before deleting. Expected: only `main.js` references it. |
| CV page too plain and forgettable | Accepted. The brief is recruiter/AI-friendly, not a design showcase. The playground carries the personality; the CV carries the substance. |
| Lost playground users who don't find their way back | Mitigated by sticky nav "← Back to playground" on the CV page. |

## Implementation Order

1. Grep to confirm MetricsHud has no callers outside `main.js`.
2. Remove MetricsHud: delete file, remove import + instantiation + update call, remove CSS block.
3. Add CV pill button to `main.js` init + CSS to `ui.js`.
4. Write `cv/index.html` — full content, inline CSS, JSON-LD, semantic structure.
5. Start local server (or confirm existing one), navigate with Playwright, visually verify both pages.
6. Take screenshots, report back.
