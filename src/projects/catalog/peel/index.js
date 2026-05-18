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
  icon:
    '<path d="M7 8 Q4 11 4 14.5 Q4 21 12 21 Q20 21 20 14.5 Q20 11 17 8 Q14 6 12 7 Q10 6 7 8 Z"/>'
    + '<path d="M12 7 V4"/>'
    + '<path d="M12 4 Q16 3 15 6 Q13 6 12 4"/>',
  description:
    "Peel is a tokenised marketplace for food waste. Surplus produce from farms, supermarkets and kitchens becomes on-chain supply; redistribution partners settle trades through Hedera-native tokens so every kilo diverted is auditable and rewarded. Built for Agentic Society × Hedera × LSE.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/peel-market" },
  ],
  abilityLabel: "Settle!",
  ability: "settle",
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
