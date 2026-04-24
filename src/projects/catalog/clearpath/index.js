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
  ],
  ability: null,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
