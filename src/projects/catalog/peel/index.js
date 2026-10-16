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
  accent: "#c5d79c", // palette C · Pistachio
  // Panel mark: one filled path on the 48u grid; source docs/brand/marks/peel.svg
  icon: '<path d="M4 44A32.492 32.492 0 0 1 44 4A32.492 32.492 0 0 1 4 44ZM9.151 38.849A27.05 27.05 0 0 0 38.849 9.151A27.05 27.05 0 0 0 9.151 38.849ZM11.515 32.485A4 4 0 1 1 19.515 32.485A4 4 0 1 1 11.515 32.485ZM20 24A4 4 0 1 1 28 24A4 4 0 1 1 20 24ZM28.485 15.515A4 4 0 1 1 36.485 15.515A4 4 0 1 1 28.485 15.515Z"/>',
  description:
    "Peel is a tokenised marketplace for food waste. Surplus produce from farms, supermarkets and kitchens becomes on-chain supply; redistribution partners settle trades through Hedera-native tokens so every kilo diverted is auditable and rewarded. Built for Agentic Society × Hedera × LSE.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/peel-market" },
  ],
  abilityLabel: "Settle!",
  ability: "settle",
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
