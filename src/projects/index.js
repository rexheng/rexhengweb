// Project catalog — glob-loaded registry.
// See docs/superpowers/specs/2026-04-24-project-sprite-workflow-design.md §3-§4.
//
// Each `src/projects/catalog/<id>/index.js` exports a project def as its
// default export. This module globs them at build time, validates, and
// assembles PROJECTS. Ability resolution (`def.ability: "stab"` → function)
// happens here so `ProjectSystem._fireAbility` can invoke the resolved
// function directly without knowing about the registry.

import { ABILITIES } from "./abilities/index.js";

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

const modules = import.meta.glob("./catalog/*/index.js", { eager: true });

export const PROJECTS = Object.entries(modules)
  .map(([path, mod]) => {
    const def = mod.default;
    return validate(def, path) ? resolveAbility(def) : null;
  })
  .filter(Boolean);
