// Simulacra — Mistral AI Hackathon · Finalist.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "simulacra",
  label: "Simulacra",
  title: "Simulacra — Mistral AI Hackathon · Finalist",
  subtitle: "2026 · AI policy simulation",
  meta: "Mistral · agentic · simulation",
  accent: "#e38c59", // palette C · Persimmon
  // Panel mark: one filled path on the 48u grid; source docs/brand/marks/simulacra.svg
  icon: '<path d="M4 4H36V26.046A11 11 0 0 0 26.046 36H4ZM13 20A7 7 0 0 0 27 20A7 7 0 0 0 13 20ZM30 37A7 7 0 0 1 44 37A7 7 0 0 1 30 37Z"/>',
  description:
    "Simulacra is an AI-powered social simulation engine: drop a policy change in, populate a city with diverse AI personas, and watch how households, small businesses, and public services respond to it in aggregate. Finalist at the Mistral AI Hackathon.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/simulacra" },
  ],
  abilityLabel: "Swarm!",
  ability: "swarm",
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
