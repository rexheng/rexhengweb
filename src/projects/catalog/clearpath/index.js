// ClearPath — Claude Hackathon @ LSE.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "clearpath",
  label: "ClearPath",
  title: "ClearPath — Claude Hackathon @ LSE",
  subtitle: "2026 · NHS cancer waiting-time reduction",
  meta: "NHS · Right to Choose · Claude",
  accent: "#005eb8",
  description:
    "ClearPath shortens NHS cancer waiting times by activating the patient's right to choose. A user tells the app where they're stuck on a referral; Claude drafts the GP transfer letter, cites the NHS Constitution right to choose, and produces a signed PDF the patient can hand back to their surgery. Built at the Claude Hackathon @ LSE.",
  links: [
    { label: "Live site", href: "https://inform-eight.vercel.app" },
    { label: "Source", href: "https://github.com/rexheng/Inform" },
  ],
  abilityLabel: "Route!",
  ability: "dispatch",
  // Block silhouette: 2.40D × 1.20D × 0.30D centred on body (D=0.26).
  // → hx 0.312, hz 0.156, hy 0.039 (very thin slab).
  // blockBaseY = -0.60D = -0.156, so meshBaseY = -0.156, hz = 0.156 → offset 0.
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
