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
  accent: "#7790a2", // palette C · Slate
  // Panel mark: one filled path on the 48u grid; source docs/brand/marks/mechanica.svg
  icon: '<path d="M10 0H38L42 4V12H6V4ZM6 16H42V24H28V33.072A8 8 0 1 1 20 33.072V24H6ZM21 40A3 3 0 0 0 27 40A3 3 0 0 0 21 40Z"/>',
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
