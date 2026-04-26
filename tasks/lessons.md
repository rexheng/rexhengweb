# Lessons — rexhengweb

Self-corrections recorded after user feedback. Review at session start.

## 2026-04-26 — Don't invent blockers around standard Three.js asset workflows

**Mistake.** When asked to consider an FBX file for the Amogus sprite, I
opened with a wall of pseudo-architectural objections — "major
architectural divergence," "zero asset pipeline," "would need conversion
to .glb" — framing it as something close to incompatible with the
project. Rex correctly called this out as a hallucination: FBX is not a
blocker.

**Reality.** Three.js ships `FBXLoader` in `three/addons/loaders/`. One
import, one async call, mesh ready. The catalog's `buildMesh()` is
currently sync, but making it async is a small plumbing change, not an
architectural reckoning. Conversion to GLB is a payload optimisation,
not a prerequisite. None of the framing as "major divergence" was
warranted.

**Why it happened.** I anchored on the existing pattern (every sprite
built procedurally in `build.js`) and treated it as a constraint rather
than a current state. The pattern is a default, not a rule. New evidence
(Rex offering a real model with better silhouette) was reason to
re-examine the default, not to defend it.

**Rule.** When the user proposes a different approach to a task,
evaluate it on actual costs (payload, async plumbing, material mapping)
not on "we don't currently do this." The catalog is a shared playground —
introducing one external asset doesn't taint the others.

**How to apply.** When asked about a non-default approach (asset format,
library swap, alternative implementation):
1. State the *real* costs in concrete terms (KB of payload, lines of
   plumbing, specific risks).
2. Don't dress preferences as architecture.
3. Don't lead with "this isn't how the project works." Lead with the
   actual tradeoffs.

## 2026-04-26 — Don't reflexively recommend GLB conversion when FBX is in hand

**Mistake.** Same session as the lesson above, made the same error in
miniature. After Rex confirmed FBX was viable, I still listed
"FBX→GLB conversion" as a parallel option and nudged toward GLB on
"industry direction" / "smaller payload" grounds. Rex pushed back: "do
a frank evaluation; threejs imports fbx so isn't this good enough?"

**Reality.** For a 47kb FBX with flat-colour materials, GLB conversion
is pure pedantry. Total first-load is ~127kb (loader + asset). The GLB
saves ~70kb but costs a Blender export step and a new file to manage.
The time spent talking about the conversion already exceeded the time
the conversion itself would save.

**Rule.** When format X is in hand and works, don't recommend
converting to format Y unless format Y solves an actual problem
(broken materials, payload too big to ship, animations that don't
load). "Better in general" is not a reason to convert.

**How to apply.** Before recommending an asset-pipeline change, name
the *specific* problem it solves with the user's *specific* asset. If
the answer is "no problem, but Y is more modern," the answer is keep X.

## 2026-04-26 — Hitboxing pitfalls when designing project sprites

**Mistakes (all in one session).**
1. Wrote auto-derive logic that **double-negated** `box.min.y`: set
   `offset = -box.min.y`, then `mesh.position.y = -offset`, which sent
   the mesh below the floor instead of lifting it up. Old explicit
   defs used the inverse convention so I assumed-without-checking that
   negating box.min.y matched it.
2. Forgot to compensate for the **collision capsule's center-vs-floor
   offset**. When a freejoint body settles, body origin sits at z =
   `hitbox.hz` (capsule half-height) above the floor. So slot-local
   y=0 is *halfway up the body*, not at the floor. Mesh-bottom must be
   shifted DOWN by `hb.hz` so it lands on the floor in world space.
3. Used `Box3.setFromObject(scene)` on FBX scenes, which **includes
   helper/empty/PivotNode transforms** in the bbox. Result: recentre
   targets a point well below the visible geometry, and Amogus's
   visible legs sink below ground because the bbox-bottom is below the
   visible mesh-bottom.

**Rules for any future project mesh work.**

- **Auto-derive footprint formula**: `mesh.position.y = -hb.hz - boxMinY`
  where `boxMinY` is `box.min.y` from a bbox over RENDERED MESHES ONLY.
  See `src/projects/system.js` spawn() and `src/projects/assets.js`
  preloadModel() — both must use a manual mesh-walking bbox that
  unions only `o.isMesh && o.geometry` children. Plain
  `Box3.setFromObject(root)` is unsafe for FBX/GLB scenes.

- **Capsule half-height = `hb.hz` = `size.y / 2`** in Three frame.
  Body settles on capsule bottom touching floor → body z = hb.hz.
  Mesh-bottom in world = body.z + mesh.position.y_local. To put
  mesh-bottom on the floor: `mesh.position.y_local = -hb.hz - boxMinY`.

- **FBX MTL diffuse values are often dark by design** (e.g. Amogus's
  red is `Kd 0.33 0 0`). Under ACES tonemap + exposure 0.9, anything
  with peak channel <0.85 crushes to near-black. Auto-boost in
  preloadModel() so peak channel hits ~0.85 before constructing the
  MeshStandardMaterial. Add a small emissive floor (~8% of color) so
  the mesh reads in low-light zones.

- **Don't trust `Box3.setFromObject` for centre-of-geometry on imported
  scenes.** Walk the tree and union only meshes with non-null
  geometry. Skip `Object3D` (helpers), `Bone`, `Light`, and anything
  named like `PivotNode_*`, `RootNode`, `Helper_*` that's common in
  FBX exports.

- **When user reports "X clips into the ground" on a project sprite**,
  the bug is almost certainly one of these three. Check in this order:
  (1) is the auto-derive formula correct, (2) is the bbox computed
  over visible meshes only, (3) does the FBX have a real mesh below
  the legs (e.g. embedded shadow plane). Don't guess — read the spawn
  code and trace the math.

- **For procedural sprites with explicit pedestal `pedestalBaseY`
  values below 0**, the bbox bottom WILL be negative. The auto-derive
  formula handles this correctly *as long as* boxMinY is computed
  honestly. Don't bypass auto-derive with handpicked offsets unless
  you've verified auto-derive is broken for that specific def.

- **Spawn capsule defaults to 0.30 × 0.30 × 0.45 half-extents**. If a
  sprite is much taller (Musicity at 0.75m → hz=0.375) or much
  shorter, the auto-derive resizes the geom but the **capsule
  collision shape is still a box**, so very wide hats / antennae /
  flagpoles will get bbox-derived hitboxes that exceed their visual
  silhouette. If a sprite has a thin tall feature on top, consider
  cropping the bbox at a fraction of its height before deriving.
