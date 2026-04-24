# Sustainalytics Scraper — silhouette check

| Feature | Target | Delivered by |
|---|---|---|
| Stack | 3 boxes, descending size, slightly staggered | box1 (1.40×0.75×1.10) > box2 (1.05×0.55×0.85) > box3 (0.70×0.45×0.60), with X offsets ±0.10×D |
| Material | Cardboard tones, two-tone (tops darker) | Per-face material array per box: sides cardboardLight `#c0996d`, tops cardboardDark `#8b6d4a` |
| Tape | Visible dark band across each box top | Thin BoxGeometry slab at top face, width matches box, depth 25% of box |
| ESG emblem | Green leaf on top box | Squished CylinderGeometry (scale 0.9·1·1.3) in leafGreen, emissive for a slight glow at dim lighting |

Silhouette reads as "stack of data" — no direct visual reference for a
scraping script exists; this is a memorable stand-in.
