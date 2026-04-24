# Amogus — sprite brief

**Project:** Amogus — 2nd Cursor Hackathon (2024)
**Card on projects/index.html:** none — not shipped to the public page (it was a weekend test, not a portfolio piece).
**Sprite role:** character / prop. A recognisable pop-culture silhouette that spawns, can be grabbed, and lunges at the humanoid when its ability fires.

## Why this sprite

- Quick to build, high recognisability, useful gag for the physics demo.
- Tests whether procedural Three.js primitives can produce a readable character without an asset pipeline.
- First worked example of the new 7-step catalog workflow — if Amogus reads cleanly as Amogus after a rebuild against a proportions sheet, the workflow is validated.

## Silhouette targets

The canonical red crewmate from Among Us (InnerSloth, 2018). Five must-have features per spec §5:

1. Flat-bottomed capsule body (Tic-Tac shape), not an egg.
2. Body proportion ≈ 1 : 2.4 width-to-height.
3. Wide wraparound visor, ~60% of face width, sitting high on the body.
4. Two stubby cylindrical legs, rounded bottoms, wide stance.
5. Backpack hugging the back curve, ~50% of torso height.
