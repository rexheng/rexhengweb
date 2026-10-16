# Project marks: the full set (14 of 14) — round 5

Round 5 answers the round-4 review (`review/REVIEW-R4.md`). The five passing marks are untouched: Amogus, Arrow, Cultivate and World Labs (approved in round 3) and Olympic Way (passed in round 4). `build5.mjs` checks their files byte-for-byte against the round-4 copies in `round4/`. ClearPath, which also passed, takes only the optional tear-line shift the critic validated. The eight failing marks are fixed or redrawn as the review asked, and palette C is revised so that amber is interaction-only again.

**Round 5 at a glance**

| mark | verdict R4 | what changed |
|---|---|---|
| ClearPath | pass | tear-line notches x34 → x36, so the stub is exactly 3 modules (16 px: notch centre x12) |
| Peel | fix | opening 21 × 10 half-dims (peas clear the lips by 3.2u); pod tips pushed to (4, 44)–(44, 4), so the wall stays 6.5u; 16 px peas r1.5 |
| Musicity | fix | side blocks step up 1 module toward the tower (left still lower than right); umber instead of ochre |
| Mechanica | redraw | tall figure: 9-module chamfered crown, **one** groove, skirt, 2-module rod with 2 modules showing, eye r8 / bore r3, no pin hole |
| Oliver Wyman | redraw | rings unbroken, no finish line; two graduated dots r2.5 → r4 rising across the infield; 16 px = one lane + two dots |
| Republic | redraw | tall figure: full-width abacus + 45° echinus, 5-module shaft with two flutes, 1-module slip, 1-module base slab; marble instead of parchment |
| Peter Network | redraw | jowly pear, chin = two convex lobes on the outline, nose under the lens, solid hair cap with a fringe point split off by a 1-module gap, stencil glasses, no smile stroke; peach instead of saffron |
| Outreach | new concept | the Thames is now the balloon's lower **outline** (Limehouse reach, Isle of Dogs lobe, estuary tail); no internal cuts |
| Simulacra | new concept | "the copy without an original": a disc lifted out of its plate and set at the corner; no three-fold lobes |

**Files**
- 14 marks on the 48u grid: `<id>.svg`. Each file holds one `<path>`, nonzero fill, holes wound in reverse.
- 14 hand-hinted 16 px drawings: `<id>-16.svg`.
- `full-set.png` (Playwright, DSF 2) contains:
  - **A** all 14 at 256 px (changed marks marked ●);
  - **B** the real Controls panel (14 tiles in panel order, Arrow active, Musicity hovered, ink filler in the 15th cell) and the 390 px mobile sheet at 24 px;
  - **C** all 14 interleaved with real marks, one colour;
  - **D** a 2 px blur row;
  - **E** 1× pixel truth at 36, 24 and 16 px;
  - **F** the nine changed marks on the module grid;
  - **G** round 4 → round 5 side by side for the nine changed marks.
- `palettes.json`: palette C revised (`directions.C.revision`, each changed colour keeps its round-4 value under `round4`, audit re-run; the round-4 audit is kept under `audit.round4`).
- `sheet.png` and `palettes.png` are kept from earlier rounds (`palettes.png` shows the round-4 C pigments).

**Sources**
- Geometry: `work/geom5.mjs` (re-exports the five passing marks unchanged from `work/geom4.mjs`).
  - `work/csg.mjs` is a small exact boolean engine for circles and polygons (union, difference, clip). It keeps true circular arcs and lines in the output, winds outer loops clockwise and holes counter-clockwise. Peter, Simulacra, Mechanica and Republic are built with it.
  - `work/out5.mjs` constructs the Outreach balloon (tangent circles solved analytically); `work/peter5.mjs` builds Peter.
- Sheet and files: `work/build5.mjs`. Palette revision: `work/palupd5.mjs`.
- Audits:
  - `work/gridcheck5.mjs`: every orthogonal edge on the module grid and every diagonal at exactly 45°, all 28 files. One flagged item, by design: Mechanica's head edges at x6 / x42 (see §1.1).
  - `work/windcheck.mjs`: one path per file, and nonzero and evenodd render identically (0 px difference on all 28 files).
  - `work/owopt.mjs`: the search that shows three graduated dots cannot fit the Oliver Wyman infield with clearance.
- Concept sketches this round: `work/s11*.mjs` to `work/s16*.mjs` (renders alongside).
- Archives: rounds 1–4 in `round1/` … `round4/`.
- Reference marks in `refs/` are for comparison only. Never ship them.

---

## 1. System

1. **Grid.** The 48u viewBox is a **12 × 12 module grid** (1 module = 4u). The live area is 10 modules (4u → 44u).
   - Every horizontal and vertical edge sits on a module line, and every diagonal is exactly 45°. `gridcheck5.mjs` confirms this across 28 files, with one stated exception: **Mechanica's head is 9 modules wide**, so its two side edges sit on the half-module line (x6, x42) to keep the figure centred. At 8 modules the piston measured 0.707–0.717 (3–5% under the set); at 10 it measured 0.778 and the rod read short again.
   - Arcs and 45° seams anti-alias, as they must. Circles may overshoot the live area by up to 1u, the way round letters overshoot a baseline.
2. **Wide figures.** A figure whose natural aspect is wide uses the **full 12-module width at 8–10 modules tall**: the Olympic Way roundel (bar 0→48u), the ClearPath ticket (48 × 32u) and the Oliver Wyman track (48 × 40u).
3. **Tall figures (new rule).** The same logic turned upright: a figure whose natural aspect is tall uses the **full 12-module height at 9–10 modules wide**. This applies to the Mechanica piston (36 × 48u) and the Republic column (40 × 48u). Their flat ends land on 0 and 48, so they are whole pixels at 36 and 24 px.
4. **Display sizes.** Desktop uses a 36 px box (1 module = 3 px), mobile 24 px (1 module = 2 px). Below 24 px every mark switches to its own hand-hinted 16 px drawing with 1 px gaps.
5. **Gap = 1 module (4u)** between separate parts, everywhere: visor, seams, QR-to-person gap, meridian, roundel lift, piston groove, column slip and flutes, lane groove, speaker spacing, Peter's hairline, the Simulacra bite.
   - **One exception: Peter's glasses rims are 2u** (half a module). A 1-module rim turns round glasses into goggles, which brings back the Minion read the review flagged (tested, `work/s16h.png`). The rims are gaps, not strokes; there are no strokes left in the set.
6. **Vocabulary.** Only modules, true circles and 45°. No Béziers anywhere.
7. **Family.** Every mark is a minimal pictogram with one cut and one idea. **Only Arrow points.** The Outreach tail is a speech-balloon tail, not an arrowhead; it was checked at 24 px in the panel.
8. **Optical balance.** The measure is √(bbox) · √(ink), as before (`harness.measure`).

   | mark | optical | vs 14-mark mean (0.742) |
   |---|---|---|
   | Amogus | 0.730 | −1.7% |
   | Arrow | 0.762 | +2.7% (approved, unchanged) |
   | **ClearPath** | 0.754 | +1.6% |
   | Cultivate | 0.744 | +0.2% |
   | **Mechanica** | 0.744 | +0.2% |
   | **Musicity** | 0.734 | −1.1% |
   | **Oliver Wyman** | 0.756 | +1.8% |
   | Olympic Way | 0.731 | −1.5% |
   | **Outreach** | 0.750 | +1.0% |
   | **Peel** | 0.741 | −0.2% |
   | **Peter Network** | 0.732 | −1.4% |
   | **Republic** | 0.748 | +0.8% |
   | **Simulacra** | 0.732 | −1.4% |
   | World Labs | 0.734 | −1.1% |

   All nine changed marks sit within ±2% of the mean (approved Arrow remains the one mark outside, as before).
9. **Colour.** Each mark uses its palette-C pigment as a flat fill on ink. **Amber is interaction-only**: this round Musicity leaves the amber (it *was* `#D4A05A`) and Peter leaves amber-2's neighbourhood. Panel states follow palettes.json: rest = pigment; hover = ink-2 tile with brightness ×1.12; active = ink-3 tile with an amber pip and amber label.
10. **Presentation (unchanged).** The mark sits directly on the panel tile, with no inner box. The 15th grid cell is an ink filler tile.

---

## 2. The approved four (geometry unchanged; fills now palette C)

### Amogus: *the definitive minimal crewmate*
The brief is "unmistakably Among Us", so the drawing itself has to be the idea. Round 1 failed because its truncated hood read as "▌f".

**What changed**
- **The full helmet is back**: r14, centred (30,18). The visor slot (visor + G, r10) is cut out of it.
- The band over the visor now ends where the helmet circle crosses the slot's front cap, in a **clean 50° point** at (42.84, 12.41). That point is computed, not drawn.
- **The visor is lower and bigger**: h12 (r6), axis at y22, 4u below the helmet centre. That leaves an 8u crown above it, like the game sprite.
- **One corner vocabulary.** The backpack is a 1-module capsule. Feet, shoulder and inner leg corners are all r = 1 module. The leg gap has a fully round top.
- The shoulder fillet (r4, centre (40,36)) lands exactly at the end of the slot's straight lower edge, so the two shapes join without a seam.
- **Round 3 polish (optional, which the review allowed):** the band's 50° point is softened with an r1.5u fillet.
  - Its centre is (40, 10.5): 12.5u from the helmet centre and 11.5u from the slot cap centre.
  - It touches the helmet at (41.2, 9.6) and lands exactly on (40,12), where the slot's straight top meets its cap. The band now ends in a rounded brim, so the figure has no sharp corner.
  - At 36 px and below the fillet is under one pixel, so the reading that passed review is unchanged.
  - The hinted 16 px file is untouched.
  - The round-2 version is in `round2/amogus.svg` if the sharp point is preferred.
- **The 16 px version is redrawn by hand**: 1 px visor ring, 1 px leg gap, 2 px backpack.

**Considered:** a square vocabulary with a slim h8 visor. It was correct, but colder and less like the site's sprite.

### Arrow: *a sealed box whose seams draw the arrow*
Round 1 read as Material's navigation glyph with a slit, and as Vercel's neighbour.

**What changed:** the arrow is now **negative space**, which was the review's primary direction.
- The silhouette is an oblique box: the TEE enclave. It also matches the site's glass-cube sprite for this project.
- Its front face is split on the diagonal into **two mirror-identical triangles**: buyer and provider. Reflection across x+y=48 maps one exactly onto the other.
- The 1-module seams between the two triangles and the box band trace **↗**. The shaft is the diagonal; the head is the corner where the top seam meets the side seam.
- **The idea:** the deal exists only in the sealed space between the parties. Remove the seams and the arrow disappears.
- Nothing points up, and nothing resembles Vercel. The silhouette is a hexagon with two 45° chamfers.

**Construction**
- Front face: 24×24 at (4,20).
- Depth band: 12u at 45°.
- Diagonal seam: perpendicular width 4u, centred on x+y=48.
- All horizontal and vertical edges are on modules.

**Rejected**
- ↗ carved from a square: the external-link icon.
- Two harpoons ⇌ in 180° symmetry: the swap icon.
- The review's fallback, a notched ↗ arrowhead: the location-services icon.

### Cultivate: *a QR corner whose fourth corner is a person*
Round 1 read as a leaf in a leaf; nobody saw the QR.

**What changed**
- QR comes first now. **Three finder eyes** use the true ring : gap : core rhythm, here 1:1:1 on the module grid (ring 4u, gap 4u, core 4u, eye 20u).
- The three eyes are **fused into one L-shaped plate**, the way they sit in the corner of a real code.
- The fourth corner, where a real QR code has *no* finder pattern, holds **a person**: a disc of 16u in its 20u cell, 1 module clear of the plate.
- The story reads in one pass: scan → a person → your graph.
- It is two pieces in total.
- The 16 px drawing uses the real QR rhythm, 1:1:3 (1 px ring, 1 px gap, 3 px core). It is an optical-size adjustment of the 1:1:1 large mark.

**Why fused:** I also drew three separate eyes. They need half-module cores, which render as grey seams at 36 px on a 1× screen. The fused plate keeps every edge on a module, so it is crisp at 36 and 24 px.

**Rejected**
- Separate eyes (grey seams at 1×).
- A single eye with a person as its core: reads as a record button.
- Ring-only eyes: a weak QR read.

### World Labs: *the Earth sign ⊕, rebuilt as a globe whose left half is the photo*
Round 1 was a generic map pin. Round 2 read as "pixels → smooth" (an upscaler) and, at 2 px blur, as the ◐ contrast icon. The smooth half was a flat "D", and at 16 px the idea disappeared.

**What it is now**
- **One circle, two cuts, both one module wide.**
  - A vertical meridian at x20–24.
  - A latitude 4u above the equator (y20–24 where it meets the meridian).
  - Together they read as the classic globe, or ⊕, the astronomical sign for Earth. That is both World Labs' "world" and Cesium's globe.
- **Left of the meridian, the photo.** It is drawn as pixels, and the latitude there is a straight scanline.
- **Right of the meridian, the world.** It is a smooth half-sphere, and the same line bends into a ∪ latitude: two concentric true arcs (r29 and r33, centred (24,−9)), sag 8u, the lowest point at the meridian.
  - That is how a latitude looks on a globe seen slightly from above.
  - One line, straight in the photo and curved on the world, is the product: a flat photo becomes a 3D world. Latitude lines are what turn the flat "D" into a sphere.
- **Squint test.** At 2 px blur it reads as a globe (⊕), not ◐. Contrast icons never have a latitude.
- **No direction.** The pixel half is now a rounded raster of the circle, not a 45° ziggurat, and it is split by the scanline, so the "<" is gone.

**Construction**
- Pixel columns above the scanline: x4–8 (one 4u pixel), x8–16 to y8, x16–20 to y4.
- Below the scanline: x4–8 to y32, x8–16 to y40, x16–20 to y44.
- These are the cells of the r20 circle whose centres fall inside it: 4/8/8/10 modules per column. The review suggested 4/8/10/10; that overshoots the circle by up to 3.3u, while 4/8/8/10 is the true raster.
- The latitude meets the outline at (41.42, 14.18) and (43.06, 17.94), at 97° (top piece) and 72° (lower piece): clean corners, no slivers.
- All 18 axis-aligned edges are on modules.

**The uneven split, on purpose:** the photo side is 16u wide and the world side 20u.
- The meridian sits half a module left of centre and the latitude half a module above it. Both point to the same reading: a globe seen from slightly above and to the right, its central meridian rotated toward the viewer.
- The gap is taken from the photo's side, so the world stays a true half-sphere.
- I tried centring the cuts. That needs half-module coordinates, which would break 1× crispness at 36 px.
- With both cuts in place the eye reads one globe, not "▌D".

**16 px:** drawn on its own grid.
- The pixel side has chunky 2 px steps (columns of 8, 12 and 14 px).
- There is a 1 px meridian and a 1 px scanline.
- On the world side the latitude rises one pixel at x11: a hinted curve. A true 1 px arc smeared grey at 1×, and a straight line lost the 3D cue.
- It still reads as a globe at 16 px, not ◐.

**Tried and dropped this round**
- **Latitude on the world half only** (the review's literal fix): the gap and seam meet in a T and the right half reads as "P" (so "ıP" overall).
- **4/8/10/10 steps:** rounder, but they overshoot the circle.
- **A pixel cap over a smooth globe:** reads as a pot with a lid.
- **Only the top-left quadrant pixelated:** the photo idea gets too faint.

**Rejected in earlier rounds**
- The cube tapering into a pin (reads as a gem).
- A sphere standing on an isometric tile (reads as an avatar).
- A globe pin with an equator line (still a pin).

**Remaining risk:** a cross in a circle can be read as a crosshair. The stepped photo half and the curved latitude are what separate it, and both survive at 24 px.

---

## 2b. The ten round-4 marks, as they stand after round 5

Each entry gives the idea, what the review asked, what changed, the construction, the 16 px drawing, and what I tested that did not work.

### ClearPath: *a fast pass — an admission ticket punched with the medical cross* (passed; one optional change)
ClearPath activates the patient's right to choose a hospital with a shorter wait. The mark is the pass that takes you out of the queue: a ticket, notched where it tears, with the NHS-style cross punched through it.
- **Round 5:** the tear-line notches move from x34 to **x36**, the critic's validated option. The notch now sits on a module line (32→40), and the stub is exactly 3 modules. Nothing else changed.
- **Construction** (wide-figure rule): ticket 0→48 × 8→40u; four r4 semicircle notches, two at the short sides, two on the tear line x = 36; cross arms 2 modules wide and 6 long, centred (20, 24).
- **16 px:** ticket 16 × 10, r1.5 notches (tear line at x12), 2 px cross.

### Musicity: *a skyline whose tallest tower is a loudspeaker* (fixed)
Cities × music: three blocks, the tallest drilled as a speaker (tweeter over woofer).
- **Review:** the three flat-topped blocks read as a bar chart (📊). **Fix:** each side block steps up one module toward the tower, so the group reads as buildings. The left block stays lower than the right (no podium).
- **Construction:** left block `M4 20H8V16H12V44H4Z`; tower 16–32 × 4–44 with tweeter r3 at (24, 15) and woofer r5.5 at (24, 31); right block `M36 12H40V16H44V44H36Z`.
- **Blur near-pair with Republic** is resolved by both redraws: Musicity now has stepped roofs, and Republic has a capital and a base.
- **Colour:** **umber** `#A67C5C` (OKLCH 62% 0.07 58) replaces ochre, which was the site amber itself.
- **16 px:** left block 1 px + 2 px columns (tops 8 / 7), tower 6 px, right block 1 px + 2 px columns (tops 4 / 5).

### Mechanica: *the piston as the factory manual draws it* (redrawn)
A motorcycle factory-manual copilot. The sprite morphs through wheel, engine, axle, gear, piston and spanner; the mark is the piston and rod.
- **Review:** the wide head, two grooves and pin hole read as a pushpin, a tag, "₸" and "≡". **Redraw, as asked:** a narrower head, exactly **one** ring groove, a visible rod 2 modules wide, no pin hole, a heavier big-end eye.
- **Construction** (tall-figure rule, 36 × 48u):
  - Crown 6→42 × 0→12, both top corners chamfered at 45° by 1 module (the crown read).
  - One ring groove, y 12–16.
  - Skirt 6→42 × 16→24.
  - Rod x 20–28, **2 modules showing** (y 24→32).
  - Big-end eye r8 at (24, 40), bore r3. It touches y48.
- **Head width:** the critic asked for about 8 modules. The head is 9 (see §1.1): at 8 the mark was 3–5% light whatever I did with the eye and chamfers, and a 3-module rod looked stubby and left the grid.
- **Tested:** eye r9 with 1.5 modules of rod (lighter rod read), rod 3 modules wide (stubby), 10-module head (0.778, rod reads short again).
- **16 px:** crown 2→14 × 0→4 with 1 px chamfers, 1 px groove, skirt 3 px, 2 px rod with 2 px showing, eye r3 / bore r1.

### Oliver Wyman: *a two-lane running track with the trend rising across the infield* (redrawn)
A 14-variable regression on marathon performance: the sprite's own "running track + ascending scatter".
- **Review:** three equal r2.2 dots were too small and the mark read as "◎" or dice; don't cut a finish line through the rings (that reads as "@" or "G"); graduate the dots, none below r2.5.
- **Redraw:** both lanes stay unbroken, there is no finish line, and the trend is **two graduated dots, r2.5 → r4**, rising from (19, 27.5) to (29, 21.5).
- **Why two, not three:** the infield is 24 × 16u. Three graduated dots (r2.5 / 3 / 3.5, or the critic's r2 / 3 / 4 with the r ≥ 2.5 floor) leave at most 0.8u to the inner lane, which closes up at 36 px. The search is `work/owopt.mjs`. Two dots keep ≥ 1.3u clear, and the size step carries the "rising" read.
- **Not applied:** the optional heavier outer lane (6u). It shrinks the infield to 20 × 12, leaving no room for the dots. At 2 px blur OW reads as a ringed oval and Olympic Way as ⊖, so the pair is separable; at 4 px OW is still a pill.
- **Construction** (wide-figure rule): stadiums 0–48 × 4–44, 4–44 × 8–40 (hole), 8–40 × 12–36, 12–36 × 16–32 (hole); dots r2.5 at (19, 27.5) and r4 at (29, 21.5).
- **16 px:** one lane (2 px) and two dots, r1.2 and r1.6, as the review specified.

### Olympic Way: *the Underground roundel, rebuilt in the system (client override)*
Per the client's override, this is the London Underground roundel, drawn to the set's rules. The ring is true circles (R18.5 / r10). The bar runs the full 12-module width (y 20–28). The bar is **lifted one module off the ring**: the system's layering gap stands in for the original's two colours (red ring, blue bar).
- **Concepts**
  - ✓ **Bar lifted 1 module.**
  - **Merged mono roundel.** The most literal (0.737), but it ignores the set's gap logic.
  - **Roundel knocked out of a square plate**, like a TfL app tile. Unmistakable, but a third square silhouette.
- **Twists tested and dropped.** A station tick on the bar and an interchange ring on the bar both weakened the instant read, and the brief says a twist is welcome only if the roundel stays instantly recognisable. Before the override I had explored the station-siting idea itself: a line bend with a new station, and three lines meeting at a new node.
- **Construction**
  - Caps are the annulus above y 16 and below y 32. Bar 0→48 × 20→28.
  - Inner/outer ratio 0.54 (TfL is about 0.6). The ring is thickened for weight.
  - Bar height ≈ ring thickness, as in the original.
- **16 px:** R6.5 / r3.5, 2 px bar, 1 px lift.
- **IP note:** the roundel is a TfL trademark. Using it is the client's decision for a personal portfolio; it is flagged here so the decision is on record.


### Outreach: *a speech balloon whose lower edge is the Thames* (new concept)
A policy tool that maps mental-health need across London's LSOAs, with a Claude chatbot on the choropleth. The balloon is the conversation; its **bottom contour is the river**.
- **Review:** the internal river and borough cuts made a tray, cup or envelope (✉); no horizontal channel across a round body, no line dropping into a U, no World Labs pixel move. Suggested direction: make the Thames the balloon's bottom outline, with the tail at the estuary.
- **Concept, as suggested:** the balloon is the north bank. Reading west to east along its lower edge: the bottom-left corner turns into a concave reach that rises 1 module (Limehouse), the **Isle of Dogs lobe** drops 1 module below the line, and the speech tail leaves where the river runs out to the estuary. There are no internal cuts at all.
- **Construction** (`work/out5.mjs`)
  - Body 4–44 × 4–32; top corners r16, bottom corners r8.
  - Tail: vertical edge x40 from the bottom-right corner down to the tip (40, 44), then 45° back up to the lobe.
  - Isle of Dogs lobe: circle (28, 28) r8, lowest point y36.
  - Limehouse reach: concave arc r6, tangent to the lobe and topping out at y28, meeting the bottom-left corner arc.
- **Tested and dropped:** a lobe on a flat bottom reads as a drip, a tooth or a mushroom stem; a tube-map 45° river base reads as a ghost or a house; two scallops read as a cloud. The reach + lobe + tail sequence is the one that reads "speech balloon" first, with the meander as the second read.
- **Risk stated honestly:** at 256 px the wavy lower edge can read as cloud-like. The tail anchors "speech" at every size, and at panel sizes it is simply a distinctive balloon.
- **16 px:** body 1–15 × 1–11 (r6 top, r3 bottom corners), lobe (9.5, 9.5) r3, reach r2 rising 1.5 px, tail to (13, 15).


### Peel: *a pea pod split open — surplus produce shelled into countable units* (fixed)
A tokenised food-waste marketplace. The pod is produce; the three peas are the units it becomes.
- **Review:** the peas crowded the lips of the opening. **Fix:** opening half-dims 21 × 10, as the critic tested: the outer peas clear the lips by 3.2u, the centre pea by 6u.
- The bigger opening made the mark light (0.716), so the pod tips move out to the live-area corners, (4, 44)–(44, 4), with the sagitta held at 16.5. The wall at the waist stays 6.5u, as the critic specified, and the weight returns to 0.741.
- **Construction:** outer vesica tips (4, 44)/(44, 4), sagitta 16.5; opening vesica half-length 21, half-width 10, reversed; peas r4 at 12u spacing on the 45° axis.
- **Colour:** pistachio calmed from L 87% / C 0.090 to L 85% / C 0.080 (`#C5D79C`).
- **16 px:** pod tips (1, 15)/(15, 1), opening 7 × 3.4, **peas r1.5**.

### Peter Network: *Peter Griffin, reduced (client override)* (redrawn)
Per the client's override, an unmistakable Peter Griffin read built from the system's circles (reference `work/ref-dl/peter.png`, study only).
- **Review:** it read as "a cartoon face with glasses"; the chin was a "3" drawn inside the cheek; the hair band read as a headband or goggle strap; saffron plus goggles made a Minion; the 2.6u strokes were the thinnest elements in the set. **Every point is addressed:**
  - **Head:** a jowly pear: crown circle r15 at (22, 19) over a wider jowl circle r15 at (21.5, 29).
  - **Chin on the silhouette:** two convex lobes on the lower-right outline, r5.2 at (36.8, 35) and r4 at (32.2, 40). With the nose above them, the right contour reads nose · chin · chin: the cleft chin is now the outline, not a stroke.
  - **Nose:** r4 at (40, 28.5), under the right lens, as in the character.
  - **Ear:** r3.8 at (6.5, 30.5) on the left.
  - **Hair:** a solid cap split off by a **1-module hairline gap**: 45° down the back of the head, level across the crown (gap y 12–16, on module lines), then 45° down into the right rim. That leaves the side-swept **fringe point** over the right lens. It is a mass, thick at the back, not a band.
  - **Glasses:** stencil-cut: 2u rims are gap rings (r4.3 → 6.3) around eye whites in ink, with r1.5 pupil holes looking right. The right lens bulges past the face, as Peter's does.
  - **No smile, no strokes.** Glasses, nose, chin and hair carry it.
  - **Colour:** **peach** `#D5A58F` (OKLCH 76% 0.065 46). Off saffron, so the Minion read and the amber-2 clash are gone.
- **Tested and dropped this round:** an arc hairline parallel to the dome (beanie or swim cap); a hairline that ran into both rims (a dark strap through the glasses: Minion again); a protruding quiff wedge (Tintin, or a cap visor); 1-module rims (goggles); hole-eyes (sunglasses).
- **Construction:** `work/peter5.mjs` on the exact CSG engine; one path, 6 subpaths, true arcs throughout.
- **Acceptance stated honestly:** I can't run the 5-of-5 viewer test. At 36 px the cues the review listed (glasses, cleft chin on the outline, hair cap with a fringe point, nose, pear) are all present and separate (sections A, C and E).
- **16 px:** pupils dropped; 1 px rims as rings on whole-pixel centres; hairline on row 4; the nose and chin lobes keep the right contour.
- **IP note:** Peter Griffin is a Fox character. This is the client's decision for a personal portfolio, flagged as with the roundel.

### Republic: *the Doric column caught mid-topple* (redrawn)
A research intelligence platform whose landmark is a procedural Doric column; its ability is *Topple!*.
- **Review:** the column was too wide and squat (read as "m", "TTT", "III"), and closing flutes inside the wide drum read as a face. **Redraw with real proportions, as asked:**
  - **Capital:** abacus 8→44 × 0→4 (full width), 45° echinus down to 12→40 at y8.
  - **Upper drum:** 5 modules (16→36), y 8–24, two 1-module flutes at x20 and x28, open at the bottom toward the slip.
  - **The slip:** 1 module (y 24–28), and the lower drum sits 1 module to the left: the topple.
  - **Lower drum:** 12→32 × 28→44, flutes at x16 and x24, open at the top toward the slip and closed by the base.
  - **Base slab:** 1 module, 4→40 × 44→48, aligned with the lower drum.
  - No flute is closed at both ends, so no drum can read as a face.
- Tall-figure rule (40 × 48u). The blur near-pair with Musicity is gone: capital and base give a silhouette no skyline has.
- **Colour:** **marble** `#C7D3DE` (OKLCH 86% 0.02 246), which breaks up the three pale yellow-greens in row 4.
- **16 px:** abacus 1 px with a 1 px 45° echinus, 7 px upper drum (2 / 1 / 1 / 1 / 2 px fillets and flutes), 1 px slip, lower drum 1 px left, 1 px base.

### Simulacra: *the copy without an original* (new concept)
An AI social-simulation engine: drop in a policy, and synthetic households, businesses and public services respond. *Simulacra* are copies. Baudrillard's simulacrum is the copy that has no original left.
- **Review:** the three-disc Venn read as ☢, ☣ or a face. No three-fold round lobes, no dark blades around a centre. Directions to try: (a) a persona with offset echoes; (b) a policy square dropped into an uneven field of agent discs.
- **Both directions tested** (`work/s13a–c.png`):
  - (a) Echoes read as the "users" icon, or as a person broadcasting (the slivers become sound waves), which is the "voice-over" glyph.
  - (b) Lattices read as dial pads or the apps grid. Ringed discs read as a flower or a cog. Scattered discs read as bubbles or "shapes". None carried the name.
- **Chosen concept:** a square plate with a round hole, and a disc **of exactly the hole's size** lifted out and set at the plate's corner, one module clear of it. The hole is the original, now absent; the disc is its copy. For the product: a synthetic population lifted out of the real one to run policy on. There is one plate, one hole and one disc: no rotation symmetry, no blades.
- **Construction:** plate 4→36 (8 modules); hole r7 at (20, 20), centred in the plate; disc r7 at (37, 37), tangent to the live-area edges; bite = the disc's circle + 1 module (r11). The wall between the hole and the bite is 6u.
- **Readings checked:** at 24 px it reads as plate + hole + ball. In my checks it did not turn into a camera, a washing machine or a record player in the panel context. It is still the most abstract mark in the set, and I state that as its risk.
- **16 px:** plate 1–12, hole r2.5 at (6.5, 6.5), disc r2.5 at (12.5, 12.5), bite r3.5.


---

## Colour (client brief: "colour scheme important")

Files: `palettes.png` shows all three directions with panels, swatches and colour-vision strips. `palettes.json` holds every value plus the audit. Source: `work/palettes.mjs` and `work/colour.mjs` (OKLCH, WCAG contrast, Machado-2009 colour-vision simulation). C was chosen in round 4 and is the fill of every shipped file. **Round 5 revises C** (below); `palettes.png` still shows the round-4 C values.

### The site's colour DNA
- **Two temperatures, one accent.**
  - **Ground**: cool twilight navy. Panel ink `#0b0e16` (OKLCH 16.5% 0.018 269); scene `#121a2a`; sky band `#2a3a5c`.
  - **Type**: warm ivory, `#efe8d8` / `#d5cdb8` / `#a69d87` (hue ≈ 88, chroma ≈ 0.03).
  - **Accent**: **amber `#d4a05a` (74% 0.107 73)** is the only chromatic UI colour. It marks active, hover, toggles, dates and links, on both the scene and the CV.
- **The 3D lighting repeats the pairing.** Warm key `#fff1d8` and warm rim `#ff8866` play against a cool fill `#88aaff`. Fill, rim and amber all sit at L ≈ 75%.
- **The CV is the same system in print**: paper `#f7f3e9`, ink `#1a1814`, deeper amber `#b07a2a`.
- **The panel already mutes project accents** to pastel (`_mutePastel`: saturation ×0.4), which shows the site's appetite for restraint.
- **Four old accents fail 4.5:1 on the panel ink**: ClearPath 3.0, Oliver Wyman 2.4, Olympic Way 4.0, Peel 4.5.

### Three directions (all 14 projects defined)
Panel order is the real alphabetical 3-column grid. "Neighbours" means horizontally or vertically adjacent tiles. ΔE is OKLab distance × 100.

| | rule | min contrast on ink | min ΔE between neighbours: normal / deutan / protan / tritan |
|---|---|---|---|
| **A · Harmonised spectrum** | 14 hues 25.7° apart, all at the amber's own L 74% / C 0.107; Musicity *is* the amber; hue slots assigned by a constrained search that keeps each project in its brand family | 7.97:1 | 9.3 / **2.3** / **3.5** / 4.5 |
| **B · Monochrome-first** | every mark rests in ivory-2 `#D5CDB8`; on hover/active it takes a pale tint of the same wheel (L 83% / C 0.075); amber stays the only UI accent | 11.07:1 (rest 12.2:1) | 6.5 / 1.7 / 2.4 / 3.3, but only when two tinted tiles touch |
| **C · Warm editorial** (round-5 revision) | named earth pigments pulled toward the amber (warm, never onto it) and the twilight navy (cool), chroma ≤ 0.13, lightness 62–86% tuned against the grid | 5.20:1 | 11.0 / **9.2** / **8.0** / **9.6** |

**C pigments (round-5 revision)**

| Project | Pigment | Hex |
|---|---|---|
| Amogus | Terracotta | `#DC836F` |
| Arrow | Mauve | `#D59CC8` |
| ClearPath | Dusk blue | `#6B8FB9` |
| Cultivate | Sage | `#A6CA9B` |
| Mechanica | Slate | `#7790A2` |
| Musicity | **Umber** (was Ochre `#D4A05A`, the site amber) | `#A67C5C` |
| Oliver Wyman | Lapis | `#8595D0` |
| Olympic Way | Brick | `#D66F6A` |
| Outreach | Verdigris | `#78BDB6` |
| Peel | Pistachio, calmed (was `#CFDD99`) | `#C5D79C` |
| Peter Network | **Peach** (was Saffron `#E3B662`) | `#D5A58F` |
| Republic | **Marble** (was Parchment `#DDD0B4`) | `#C7D3DE` |
| Simulacra | Persimmon | `#E38C59` |
| World Labs | Atlantic | `#77B6C8` |

**A** and **B** share one hue wheel. Under deuteranopia and protanopia, A's single lightness makes cool neighbours converge (Arrow and ClearPath, ΔE 2.3). No assignment fixes this while keeping brand hue families: the search tried all 1,008 valid assignments.

**C** solves it with lightness instead. Neighbouring tiles always differ in lightness or along the blue–yellow axis, so every adjacent pair stays at or above ΔE 8.0 in every simulation (round-5 values). Some non-adjacent pairs converge under colour-vision deficiency (e.g. Musicity and Olympic Way, protan ΔE 2.0). That is unavoidable with 14 colours, and there the shape and the label carry identity.

### Recommendation: C, with B's restraint in the states
- **C is the only direction derived from the site rather than laid over it.**
  - Its pigments live inside the site's own warm/cool pairing.
  - Its chroma never exceeds the amber's, so nothing out-shouts the one UI accent.
  - It reads like the CV's print world, not a SaaS rainbow.
  - Each project keeps a colour at rest, which is what "colour scheme important" asks for.
- **A** is the generic category wheel and fails colour-blind neighbours.
- **B** is the most elegant panel, but it hides the colour the client wants and still needs a palette for the 3D labels and project cards.
- **Apply it**
  - Set each def's `accent` to its C pigment, so tiles, 3D labels and project cards share one source.
  - Keep amber as the only interaction colour (active pip, active and hover labels).
  - Remove `_mutePastel` in `controlsPanel.js`; the pigments are already tuned for the ink.
  - Add an ink filler tile so the empty 15th grid cell doesn't show the rule colour.

### Round-5 revision of C (review must-fix)
- **The interaction amber was appearing at rest.** Musicity's ochre was exactly `#D4A05A`, and Peter's saffron `#E3B662` sat next to amber-2 `#E9B976`.
  - **Musicity → umber** `#A67C5C` (L 62%): 12.8 ΔE from amber, 19.9 from amber-2.
  - **Peter → peach** `#D5A58F`: 6.1 from amber, 7.7 from amber-2. It is a skin tone, so the Minion read goes with it.
  - The nearest pigment to the accent is now Simulacra's persimmon at 5.3 ΔE (unchanged; hue 50° against amber's 73°).
- **Row 4 was three pale yellow-greens** (Peel, Peter, Republic). It now runs pistachio · peach · marble: L 85 / 76 / 86, hues 122 / 46 / 246.
- **Re-run audit** (Machado-2009 simulation, adjacent panel tiles):

  | | normal | deutan | protan | tritan |
  |---|---|---|---|---|
  | worst neighbour ΔE, round 4 | 9.7 | 7.7 | 8.2 | 8.5 |
  | worst neighbour ΔE, round 5 | **11.0** (Mechanica/Musicity) | **9.2** (Peel/Peter) | **8.0** (Peter/World Labs) | **9.6** (Amogus/Arrow) |
  | Peter ↔ Olympic Way (the pair above Peter) | 12.5 | 9.8 | 13.5 | 13.1 |

  Every adjacent pair is at or above ΔE 8.0 in every simulation. Minimum contrast on ink drops from 5.75 to **5.20:1** (Musicity's umber), still above 4.5:1. Non-adjacent pairs that converge under CVD: Musicity/Olympic Way (protan 2.0) and Arrow/Outreach (deutan 2.1). They are never neighbours, and shape and label carry identity.

---

## 3. Site integration (not done; repo untouched)

- In `src/controlsPanel.js`, replace the 24u stroke wrapper with a fill wrapper: `viewBox="0 0 48 48"`, `fill` set to the mark colour, no stroke. Each def's `icon` becomes the single `<path d>` from its file.
- In `src/ui.js`, make `.rex-tile-swatch` 36×36 with no background, and 24×24 in the mobile query.
- Use the `*-16.svg` drawings anywhere a mark renders at 16–20 px (favicons, inline chips).
- Set each def's `accent` to its revised C pigment (`palettes.json` → `directions.C.colours`). Musicity, Peel, Peter Network and Republic changed this round.
- Olympic Way, ClearPath and Oliver Wyman use the full 48u width (wide-figure rule); Mechanica and Republic the full 48u height (tall-figure rule). Give them the same 36 / 24 px box and do not crop.
