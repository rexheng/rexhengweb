// Peter Network — six-outfit Instagram persona with cycle ability.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "peter-network",
  label: "NUS · @nus.peter",  // initial outfit; cycle updates this at runtime
  title: "Peter Network — NUS × LSE × Cambridge",
  subtitle: "agentic Instagram education",
  meta: "instagram · agentic pipeline",
  accent: "#ef7d00", // NUS orange — matches initial outfit; cycle overwrites
  description:
    "Educational-content network on Instagram spanning NUS, LSE, and Cambridge handles — reached 500K+ views and 2K followers in 3-4 months (~200% monthly growth), with agentic AI pipelines producing law, finance, and career content. Click Cycle to swap between the six outfits.",
  links: [
    { label: "@nus.peter", href: "https://www.instagram.com/nus.peter" },
    { label: "@lse.peter", href: "https://www.instagram.com/lse.peter" },
    { label: "@cambridge.peter", href: "https://www.instagram.com/cambridge.peter" },
  ],
  abilityLabel: "Cycle",
  ability: "cycle",
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
