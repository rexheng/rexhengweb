// Oliver Wyman Datathon — 1st place. Extruded logo + backing plate.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";

export default {
  id: "oliver-wyman",
  label: "Oliver Wyman Datathon",
  title: "Oliver Wyman Datathon — 1st place",
  subtitle: "marathon performance · 14-variable regression",
  meta: "datathon · regression · endurance",
  accent: "#e6372a",
  description:
    "A 14-variable linear regression on marathon performance data — splits, pace, elevation, weather, fuelling, sleep — teasing out which signals actually move finish time and which are just gym folklore. Took 1st place at the Oliver Wyman Datathon.",
  links: [],
  abilityLabel: "Sprint!",
  ability: "roomba",
  // Hitbox + footprintOffset auto-derived (§3.9).
  buildMesh: () => buildMesh({ THREE, proportions }),
};
