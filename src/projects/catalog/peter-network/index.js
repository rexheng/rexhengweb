// Peter Network — six-outfit Instagram persona with cycle ability.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";
import { cycle } from "../../abilities/cycle.js";

const AUTO_CYCLE_PERIOD_MS = 8000;

export default {
  id: "peter-network",
  label: "NUS · @nus.peter",  // initial outfit; cycle updates this at runtime
  title: "Peter Network — NUS × LSE × McKinsey",
  subtitle: "agentic Instagram education",
  meta: "instagram · agentic pipeline",
  accent: "#d5a58f", // palette C · Peach; outfits recolour the mesh only
  // Panel mark: one filled path on the 48u grid; source docs/brand/marks/peter-network.svg
  icon: '<path d="M7.338 15.834A15 15 0 0 1 36.866 17.003A6.3 6.3 0 0 0 33.407 16.579L28.828 12H11.172ZM7.628 23.294A15 15 0 0 1 7.227 21.601L12.828 16H27.172L29.736 18.565A6.3 6.3 0 0 0 28.7 20.117A6.3 6.3 0 1 0 28.7 25.483A6.3 6.3 0 0 0 40.459 24.526A4 4 0 0 1 41.245 32.301A5.2 5.2 0 0 1 36.197 40.165A4 4 0 0 1 28.798 42.105A15 15 0 0 1 7.425 34.186A3.8 3.8 0 1 1 6.677 26.704A15 15 0 0 1 7.628 23.294ZM18.7 22.8A4.3 4.3 0 0 1 27.3 22.8A4.3 4.3 0 0 1 18.7 22.8ZM22.6 23.4A1.5 1.5 0 0 0 25.6 23.4A1.5 1.5 0 0 0 22.6 23.4ZM30.1 22.8A4.3 4.3 0 0 1 38.7 22.8A4.3 4.3 0 0 1 30.1 22.8ZM34 23.4A1.5 1.5 0 0 0 37 23.4A1.5 1.5 0 0 0 34 23.4Z"/>',
  description:
    "Educational-content network on Instagram spanning NUS, LSE, and McKinsey handles — reached 500K+ views and 2K followers in 3-4 months (~200% monthly growth), with agentic AI pipelines producing law, finance, and consulting content. Peter slowly rotates through the six outfits, and Cycle jumps to the next one.",
  links: [
    { label: "@nus.peter", href: "https://www.instagram.com/nus.peter" },
    { label: "@lse.peter", href: "https://www.instagram.com/lse.peter" },
    { label: "@mckinsey.peter", href: "https://www.instagram.com/mckinsey.peter" },
  ],
  abilityLabel: "Cycle",
  ability: "cycle",
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
  onSpawn(slot, ctx) {
    const mesh = ctx?.mesh;
    if (!mesh?._peterParts) return null;

    if (slot?.project) {
      slot.project = { ...slot.project };
    }

    let elapsed = 0;
    return {
      tick(dtMs) {
        elapsed += dtMs;
        while (elapsed >= AUTO_CYCLE_PERIOD_MS) {
          elapsed -= AUTO_CYCLE_PERIOD_MS;
          cycle({ slot, mesh });
        }
        return true;
      },
      cancel() { /* no restoration needed; the mesh is being parked */ },
    };
  },
};
