// Musicity — Encode AI Hackathon. Voxel apartment with palette cycle.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import { PALETTES, PALETTE_PERIOD_MS } from "./proportions.js";

export default {
  id: "musicity",
  label: "Musicity",
  title: "Musicity — Encode AI Hackathon",
  subtitle: "city + music × AI",
  meta: "Encode · hackathon · music",
  accent: "#d4a05a",
  description:
    "Musicity was an Encode AI Hackathon entry at the intersection of cities and music — the skyline below and the floating note above are the sprite's shorthand. Full project writeup pending.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/musicity" },
  ],
  abilityLabel: "Play!",
  ability: "chord",
  // Hitbox + footprintOffset auto-derived (§3.9).
  buildMesh: () => buildMesh({ THREE }),
  // Idle palette cycle. Crossfades between PALETTES every PALETTE_PERIOD_MS.
  onSpawn(slot, ctx) {
    const mats = ctx.mesh?.userData?.musicityMats;
    if (!mats) return null;
    let elapsed = 0;
    // Working colour objects so we don't allocate per frame.
    const tmpCol = new THREE.Color();
    const colA = new THREE.Color();
    const colB = new THREE.Color();
    return {
      tick(dtMs) {
        elapsed += dtMs;
        const phase = elapsed / PALETTE_PERIOD_MS;
        const i = Math.floor(phase) % PALETTES.length;
        const j = (i + 1) % PALETTES.length;
        const f = phase - Math.floor(phase);
        for (const key of ["wall", "window", "balcony"]) {
          colA.set(PALETTES[i][key]);
          colB.set(PALETTES[j][key]);
          tmpCol.copy(colA).lerp(colB, f);
          mats[key].color.copy(tmpCol);
        }
        return true;     // run forever (cancelled by _park)
      },
      cancel() { /* nothing to restore — colours don't need preserving */ },
    };
  },
};
