# Republic — sprite brief

**Project:** Republic — a procedural Doric column sprite
**Card on projects/index.html:** none — this is a new sprite without a
corresponding public project card. The abstract on the in-scene info card
is a placeholder pending Rex's own copy.
**Sprite role:** landmark. A tall marble Doric column that visibly towers
over the 1m humanoid in the ragdoll playground. Can be grabbed; fires a
`topple` ability that fells it like a cut tree.

## Why this sprite

- First sprite that isn't a character — tests the workflow on architecture.
- Tall + thin silhouette stress-tests the slot capsule contract (collision
  capsule is short; visual mesh extends far above).
- Introduces the `topple` ability that's reusable for any tall object later
  (lighthouses, statues, masts, …).

## Silhouette targets

See spec §6 acceptance table. Summary: ~6×D total height vs ~1.3×D max
width, visible vertical fluting, square abacus on flared echinus, torus
band on a wider plinth at the base.
