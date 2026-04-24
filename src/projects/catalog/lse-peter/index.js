import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "lse-peter",
  label: "LSE Peter",
  title: "LSE Peter · Instagram (@lse.peter)",
  subtitle: "Instagram · LSE students",
  meta: "instagram · education",
  accent: "#6b1f5f",
  description:
    "Educational content series on Instagram under the handle @lse.peter — part of the Peter Network, a group of accounts producing engaging learning resources for students across disciplines.",
  links: [
    { label: "Visit Profile", href: "https://www.instagram.com/lse.peter" },
  ],
  ability: null,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
