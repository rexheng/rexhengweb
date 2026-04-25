// Peel — Agentic Society Hedera × LSE.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "peel",
  label: "Peel",
  title: "Peel — Agentic Society Hedera × LSE",
  subtitle: "tokenised food-waste marketplace",
  meta: "Hedera · marketplace · sustainability",
  accent: "#2e8b3e",
  description:
    "Peel is a tokenised marketplace for food waste. Surplus produce from farms, supermarkets and kitchens becomes on-chain supply; redistribution partners settle trades through Hedera-native tokens so every kilo diverted is auditable and rewarded. Built for Agentic Society × Hedera × LSE.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/peel-market" },
  ],
  ability: null,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
