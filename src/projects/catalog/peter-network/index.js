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
  accent: "#ef7d00", // NUS orange — matches initial outfit; cycle overwrites
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
