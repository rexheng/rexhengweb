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
  // Warm sandstone accent.
  accent: "#c9b58a",
  description:
    "The Republic is a research intelligence platform built at ETH Oxford — built around the procedural Doric column that reads as both title and landmark. It ingests research literature and synthesises it into navigable briefs, so a user can walk into a new field and leave with a defensible position rather than a tab graveyard.",
  links: [],
  abilityLabel: "Topple!",
  ability: "topple",
  footprintOffset: 0.19,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
