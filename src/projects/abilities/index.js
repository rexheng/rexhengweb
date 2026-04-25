// Ability registry — string-keyed lookup table.
// See docs/superpowers/specs/2026-04-24-project-abilities-and-hitboxes-design.md.
import { stab } from "./stab.js";
import { topple } from "./topple.js";
import { pulse } from "./pulse.js";
import { swarm } from "./swarm.js";
import { cycle } from "./cycle.js";
import { heatmap } from "./heatmap.js";
import { dispatch } from "./dispatch.js";
import { sprint } from "./sprint.js";
import { settle } from "./settle.js";
import { launch } from "./launch.js";
import { chord } from "./chord.js";

export const ABILITIES = {
  stab, topple, pulse, swarm, cycle,
  heatmap, dispatch, sprint, settle, launch, chord,
};
