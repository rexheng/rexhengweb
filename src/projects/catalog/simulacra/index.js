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
  accent: "#ff7138",
  description:
    "Simulacra is an AI-powered social simulation engine: drop a policy change in, populate a city with diverse AI personas, and watch how households, small businesses, and public services respond to it in aggregate. Finalist at the Mistral AI Hackathon.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/simulacra" },
  ],
  abilityLabel: "Swarm!",
  ability: "swarm",
  footprintOffset: 0.37,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
