// Shared ability helpers — THREE↔MJ swizzle, qvel writes, body lookup.
// See docs/superpowers/specs/2026-04-24-project-sprite-workflow-design.md §3.

/**
 * Locate a THREE.Object3D body in `app.bodies` by its MJCF name.
 * Returns the object, or null when no body matches.
 */
export function findBody(app, name) {
  const bodies = app.bodies;
  if (!bodies) return null;
  for (const b of Object.values(bodies)) if (b?.name === name) return b;
  return null;
}
