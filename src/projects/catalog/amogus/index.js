// Amogus project definition — as-is port from the pre-refactor registry.
// Step 6 replaces this with a proper workflow pass (BRIEF/REFS/proportions/etc.)
// and rewrites the description as a project abstract.

import { buildAmogus } from "./build.js";

export default {
  id: "amogus",
  label: "Amogus",
  title: "Amogus — 2nd Cursor Hackathon",
  subtitle: "2024 · a sus little guy",
  meta: "three.js · procedural",
  accent: "#e25d63",
  description:
    "Red Among Us crewmate as a physics-enabled prop. Built procedurally in Three.js — rounded torso, cyan fresnel visor, two stub legs, backpack with a glowing antenna. Click Stab! to make him lunge at the humanoid in a spinning forward-stab.",
  links: [
    { label: "Source", href: "#" },
  ],
  abilityLabel: "Stab!",
  ability: "stab",
  buildMesh: buildAmogus,
};
