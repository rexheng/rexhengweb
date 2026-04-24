import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "nus-peter",
  label: "NUS Peter",
  title: "NUS Peter · Instagram (@nus.peter)",
  subtitle: "Instagram · NUS students",
  meta: "instagram · education",
  accent: "#ef7d00",
  description:
    "Educational content series on Instagram under the handle @nus.peter — part of the Peter Network, a group of accounts producing engaging learning resources for students across disciplines.",
  links: [
    { label: "Visit Profile", href: "https://www.instagram.com/nus.peter" },
  ],
  ability: null,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
