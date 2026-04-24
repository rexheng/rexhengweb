import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "four-letters",
  label: "Four Letters",
  title: "Four Letters — word-search puzzle game",
  subtitle: "2024 · JavaScript · touch controls",
  meta: "javascript · game design · ui",
  accent: "#d47a42",
  description:
    "Word-search puzzle game with custom game logic and implementation. Features intuitive UI design with multiple input methods including type, swipe, and tap controls for seamless gameplay across devices.",
  links: [
    { label: "Play Game", href: "https://four-letters-two.vercel.app/" },
  ],
  ability: null,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
