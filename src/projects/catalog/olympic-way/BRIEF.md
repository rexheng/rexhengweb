# Olympic Way — sprite brief

**Project:** Olympic Way Interchange — Susquehanna Datathon 2026, 1st place.
**Sprite role:** landmark. A recognisable public-transit icon that doubles as
a physics prop in the ragdoll playground.

## Why this sprite

The London Underground roundel is the cleanest possible shorthand for "new
tube station". It reads instantly from any angle, scales well to the slot
capsule, and has a strong colour identity that makes the ability (`pulse` —
radiating graph nodes) feel like a station map lighting up.

## Silhouette targets

1. Red circular torus — outer 0.85×D, tube 0.12×D.
2. Horizontal blue bar — 1.75×D × 0.28×D × 0.10×D, threaded through the torus
   centre.
3. White text plate on the bar — a slab 42% of the bar's width.
4. Dark plinth beneath — cylinder 1.0×D radius × 0.20×D tall.

## Ability

`pulse` — for ~2 seconds emit 3–4 small red "node" markers that radiate
outward from the slot's origin and fade. Metaphor: a Monte Carlo pass over
the 358-node network lighting up candidate stations.
