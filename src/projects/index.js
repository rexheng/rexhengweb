// Project catalog — explicit-import registry.
// See docs/superpowers/specs/2026-04-24-project-sprite-workflow-design.md §3-§4.
//
// Each `src/projects/catalog/<id>/index.js` exports a project def as its
// default export. This module imports each one explicitly (plain ES modules,
// not Vite's import.meta.glob — the site is served statically by serve.py),
// validates them, and assembles PROJECTS. Ability resolution
// (`def.ability: "stab"` → function) happens here so
// `ProjectSystem._fireAbility` can invoke the resolved function directly.
//
// Adding a project: drop a folder under catalog/<id>/, then append one line
// to the ENTRIES array below.

import { ABILITIES } from "./abilities/index.js";

import amogus from "./catalog/amogus/index.js";
import arrow from "./catalog/arrow/index.js";
import clearpath from "./catalog/clearpath/index.js";
import musicity from "./catalog/musicity/index.js";
import oliverWyman from "./catalog/oliver-wyman/index.js";
import olympicWay from "./catalog/olympic-way/index.js";
import outreach from "./catalog/outreach/index.js";
import peel from "./catalog/peel/index.js";
import peterNetwork from "./catalog/peter-network/index.js";
import republic from "./catalog/republic/index.js";
import simulacra from "./catalog/simulacra/index.js";

const ENTRIES = [
  ["catalog/amogus/index.js", amogus],
  ["catalog/arrow/index.js", arrow],
  ["catalog/clearpath/index.js", clearpath],
  ["catalog/musicity/index.js", musicity],
  ["catalog/oliver-wyman/index.js", oliverWyman],
  ["catalog/olympic-way/index.js", olympicWay],
  ["catalog/outreach/index.js", outreach],
  ["catalog/peel/index.js", peel],
  ["catalog/peter-network/index.js", peterNetwork],
  ["catalog/republic/index.js", republic],
  ["catalog/simulacra/index.js", simulacra],
];

const REQUIRED_STRING_FIELDS = ["id", "label", "title"];

function validate(def, path) {
  if (!def || typeof def !== "object") {
    console.error(`[projects] ${path}: default export is not an object`);
    return false;
  }
  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof def[field] !== "string" || !def[field]) {
      console.error(`[projects] ${path}: missing required string field "${field}"`);
      return false;
    }
  }
  if (typeof def.buildMesh !== "function") {
    console.error(`[projects] ${path}: buildMesh must be a function`);
    return false;
  }
  if (def.ability != null) {
    if (typeof def.ability !== "string") {
      console.error(`[projects] ${path}: ability must be a string key or null`);
      return false;
    }
    if (!(def.ability in ABILITIES)) {
      console.error(`[projects] ${path}: ability "${def.ability}" not in ABILITIES`);
      return false;
    }
  }
  if (def.onSpawn != null && typeof def.onSpawn !== "function") {
    console.error(`[projects] ${path}: onSpawn must be a function`);
    return false;
  }
  if (def.fbx != null) {
    if (typeof def.fbx.url !== "string"
        || !def.fbx.target
        || typeof def.fbx.target.axis !== "string"
        || typeof def.fbx.target.value !== "number") {
      console.error(`[projects] ${path}: fbx must be { url: string, target: { axis: string, value: number } }`);
      return false;
    }
  }
  if (def.abilityFbx != null) {
    if (typeof def.abilityFbx.url !== "string"
        || !def.abilityFbx.target
        || typeof def.abilityFbx.target.axis !== "string"
        || typeof def.abilityFbx.target.value !== "number"
        || typeof def.abilityFbx.cacheKey !== "string") {
      console.error(`[projects] ${path}: abilityFbx must be { url, target: { axis, value }, cacheKey }`);
      return false;
    }
  }
  return true;
}

function resolveAbility(def) {
  // The def stores `ability` as a string key (or null). The ProjectSystem
  // expects `def.ability` to be a function (legacy shape). Wrap the resolved
  // function under the same key so both shapes work and `abilityKey` keeps
  // the string form for debugging.
  if (def.ability == null) return { ...def, abilityKey: null };
  const fn = ABILITIES[def.ability];
  return { ...def, abilityKey: def.ability, ability: fn };
}

export const PROJECTS = ENTRIES
  .map(([path, def]) => (validate(def, path) ? resolveAbility(def) : null))
  .filter(Boolean);
