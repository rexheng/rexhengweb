// Ability registry — string-keyed lookup table.
// See docs/superpowers/specs/2026-04-24-project-sprite-workflow-design.md §4.4.
import { stab } from "./stab.js";
import { topple } from "./topple.js";
import { pulse } from "./pulse.js";
import { swarm } from "./swarm.js";
import { cycle } from "./cycle.js";

export const ABILITIES = { stab, topple, pulse, swarm, cycle };
