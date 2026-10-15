// Mechanica — HackMIT 2026. One sprite, six mechanical parts, cycled by
// the `morph` ability (Wheel → Engine → Axle → Gear → Piston → Spanner).

import { buildMesh } from "./build.js";
import { HITBOX, PARTS } from "./parts.js";

export default {
  id: "mechanica",
  label: "Mechanica",
  title: "Mechanica — HackMIT 2026",
  subtitle: "2026 · Factory-manual copilot for mechanics",
  meta: "Elastic · Transformers.js · HackMIT",
  accent: "#5d84a8", // steel blue (label tick + card)
  icon:
    '<path d="M10.4 5.2 L10.8 2.9 L13.2 2.9 L13.6 5.2 L15.7 6.0 L17.6 4.7 L19.3 6.4 L18.0 8.3'
    + ' L18.8 10.4 L21.1 10.8 L21.1 13.2 L18.8 13.6 L18.0 15.7 L19.3 17.6 L17.6 19.3 L15.7 18.0'
    + ' L13.6 18.8 L13.2 21.1 L10.8 21.1 L10.4 18.8 L8.3 18.0 L6.4 19.3 L4.7 17.6 L6.0 15.7'
    + ' L5.2 13.6 L2.9 13.2 L2.9 10.8 L5.2 10.4 L6.0 8.3 L4.7 6.4 L6.4 4.7 L8.3 6.0 Z"/>'
    + '<circle cx="12" cy="12" r="3"/>',
  description:
    "Mechanica is a phone-first copilot for motorcycle mechanics: name your bike and the part, and it opens the exact factory-manual pages for the job, walks you through them in order, and drafts a parts quote to real suppliers. Search runs on Elastic Cloud across five OEM manuals and 74 maintenance jobs, with in-browser question answering (BM25 + DistilBERT via Transformers.js) and offline support. Built at HackMIT 2026. Double-click the part to cycle through the toolbox.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/handy-book" },
  ],
  abilityLabel: "Morph!",
  ability: "morph",
  // Baked GLB holding the wheel, axle and spanner nodes (see REFS.md).
  // build.js re-normalises each node itself; target only sizes the cache.
  fbx: { url: "./assets/models/mechanica/mechanica-parts.glb", target: { axis: "y", value: 0.5 } },
  // Fixed envelope that fits every part, so morphing never resizes the
  // physics geom. footprintOffset stays auto (every part's bottom is y=0).
  hitbox: HITBOX,
  buildMesh: () => buildMesh(),
  // Label shows which part is out; morph keeps it updated.
  onSpawn(slot, ctx) {
    const st = ctx?.mesh?._morph;
    const name = st?.parts?.[st.index]?.name ?? PARTS[0].name;
    const text = slot?.labelEl?.querySelector(".rex-project-label-text");
    if (text) text.textContent = `${slot.project?.label ?? "Mechanica"} · ${name}`;
    return null;
  },
};
