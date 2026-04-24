import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "neo-riemannian-explorer",
  label: "Neo-Riemannian Explorer",
  title: "Neo-Riemannian Explorer — chord transformation visualiser",
  subtitle: "2024 · React · Vite",
  meta: "react · vite · music theory",
  accent: "#8a6bbf",
  // Description pulled verbatim from projects/index.html card.
  description:
    "Interactive music theory visualisation tool featuring two modes: Transformation for chord transformations (P/L/R operations) with visual graph traversal, and Negative Harmony Mode for converting chords and progressions using axis reflection. Includes chord identification, interactive piano, and keyboard shortcuts.",
  links: [
    { label: "View Project", href: "https://neoriemannian.vercel.app/" },
  ],
  ability: null,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
