// Olympic Way — Susquehanna Datathon 2026 · 1st place.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "olympic-way",
  label: "Olympic Way",
  title: "Olympic Way Interchange — Susquehanna Datathon 2026 · 1st place",
  subtitle: "2026 · graph-theoretic station siting",
  meta: "datathon · graph theory · Monte Carlo",
  accent: "#dc241f",
  description:
    "A new tube station, sited by graph theory rather than planning politics. Given a 358-node underground network, the model treats every candidate Olympic Way interchange as a shortest-path shift across the system and runs Monte Carlo over passenger flow to score which location relieves the most load with the fewest dominoes. Took 1st place at the Susquehanna Datathon 2026.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/london_lsoa_map" },
  ],
  abilityLabel: "Pulse!",
  ability: "pulse",
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
