# Sustainable Report Analyser — silhouette check

| Feature | Target | Delivered by |
|---|---|---|
| Folder slab | Flat wide slab with two-tone faces | folderWidth=1.60*D × folderDepth=1.10*D × folderHeight=0.18*D; per-face material array puts darker `folderInside` on the bottom face |
| Peeking page | Thin cream slab slightly above and shifted back | pageWidth=1.30*D × pageDepth=0.95*D sits at `pageZOffset=-0.12*D` (back) and `pageHeight=0.02*D` above folder top |
| Text lines | 5 thin parallel stripes on the page | `lineCount=5`, `linePitch=0.12*D` — reads as "printed lines" from oblique view |
| Magnifier | Ring + glass disc + angled handle on the cover | TorusGeometry(`lensRadius=0.22*D`) rotated horizontal, offset from folder centre; transparent glass cylinder inside; handle cylinder angled 45° |
| Palette tie-in | Sage for folder, sandstone for magnifier (ties to Republic & ESG scraper) | folderCover `#5a7b4a`, lensRing `#c9b58a` |

No ability — project is an AI prompt pipeline, nothing maps to physics.
