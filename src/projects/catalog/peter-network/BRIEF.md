# Peter Network — sprite brief

**Project:** Peter Network — Instagram education across NUS, LSE, Cambridge.
500K+ views, 2K followers, ~200% monthly growth in 3-4 months.
**Sprite role:** character with a runtime-mutable outfit. One Peter,
six outfits, cycled via the `cycle` ability.

## Why this sprite

The six outfits encode the network's structure: three universities
(NUS, LSE, Cambridge) and three themes (law, finance, career). A single
cyclable Peter is more honest than six separate sprites — it makes the
"these are all facets of one operation" legible.

## Silhouette targets

1. Body — flat-bottomed capsule with a rounded head, matching the shared
   `peterAvatar` silhouette. Recomposed inline in `build.js` so the
   body/accent materials are swappable (the shared primitive constructs
   its own materials, which can't be hot-swapped).
2. Emblem above the head — one of six, keyed by outfit:
   - NUS → mortarboard (board + cap + tassel)
   - LSE → book stack (3 descending books with gilt trim)
   - Cambridge → scroll (cylinder + ribbon)
   - Law → scales of justice (pillar + beam + 2 pans)
   - Finance → ascending bar chart (3 green bars)
   - Career → briefcase (box + handle arch)

## Ability

`cycle` — instant (no tick loop). Advances the outfit index, mutates
body/accent material `.color`, disposes the old emblem group and attaches
a fresh one, updates the floating label's text and accent. Designed to
survive rapid repeated invocations without leaks (each emblem's geometries
and materials are disposed explicitly).
