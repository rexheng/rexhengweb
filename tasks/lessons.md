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
