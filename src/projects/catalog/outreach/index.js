// Outreach — Claude Hackathon @ Imperial · Top 8 of 130.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "outreach",
  label: "Outreach",
  title: "Outreach — Claude Hackathon @ Imperial · Top 8 of 130",
  subtitle: "2026 · policy tool for mental health need",
  meta: "policy · LSOA · Claude agents",
  accent: "#78bdb6", // palette C · Verdigris
  // Panel mark: one filled path on the 48u grid; source docs/brand/marks/outreach.svg
  icon: '<path d="M20 4H28A16 16 0 0 1 44 20V24A8 8 0 0 1 40 30.928V44L31.292 35.292A8 8 0 0 1 20.772 31.429A6 6 0 0 0 9.811 31.695A8 8 0 0 1 4 24V20A16 16 0 0 1 20 4Z"/>',
  description:
    "A policy tool that maps mental-health need across all 4,994 London LSOAs, then lets a commissioner talk to the map — a Claude chatbot sits on top of the choropleth and explains where need is concentrated, why, and what services already reach it. Solo build at the Claude Hackathon @ Imperial, finished in the Top 8 of 130 teams.",
  links: [
    { label: "Live site", href: "https://outreach-london.vercel.app" },
    { label: "Source", href: "https://github.com/rexheng/Outreach" },
  ],
  abilityLabel: "Pulse need!",
  ability: "heatmap",
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
