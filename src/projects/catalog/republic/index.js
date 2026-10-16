// Republic project def.
// See spec §4.3 + §6.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "republic",
  label: "Republic",
  title: "The Republic — research intelligence platform",
  subtitle: "2026 · ETH Oxford",
  meta: "research · intelligence · ETH Oxford",
  accent: "#c7d3de", // palette C · Marble
  // Panel mark: one filled path on the 48u grid; source docs/brand/marks/republic.svg
  icon: '<path d="M8 0H44V4L40 8H36V24H32V12H28V24H24V12H20V24H16V8H12L8 4ZM12 28H16V40H20V28H24V40H28V28H32V44H40V48H4V44H12Z"/>',
  description:
    "The Republic is a research intelligence platform built at ETH Oxford — built around the procedural Doric column that reads as both title and landmark. It ingests research literature and synthesises it into navigable briefs, so a user can walk into a new field and leave with a defensible position rather than a tab graveyard.",
  links: [],
  abilityLabel: "Topple!",
  ability: "topple",
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
