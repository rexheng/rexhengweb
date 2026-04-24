// Re-export shim — keeps `src/main.js` import line working during the
// structural refactor. Deleted in step 8 once main.js points at the new
// module directly.
// See docs/superpowers/specs/2026-04-24-project-sprite-workflow-design.md §8.
export { ProjectSystem } from "./projects/system.js";
export { PROJECTS } from "./projects/index.js";
