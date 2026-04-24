// scripts/validate-catalog.mjs
//
// Structural validator for the catalog. We can't run the project's
// Vite-flavoured src/projects/index.js under plain Node (it uses
// import.meta.glob + an esm.sh import map for `three`), so this script
// reads every src/projects/catalog/<id>/index.js as text and verifies:
//
//   - default export is an object literal with `id`, `label`, `title`
//   - `buildMesh` is present and callable
//   - `ability` is either null/absent or a string in the ABILITIES set
//
// Usage: node scripts/validate-catalog.mjs

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CATALOG = resolve(ROOT, "src", "projects", "catalog");
const ABILITIES_INDEX = resolve(ROOT, "src", "projects", "abilities", "index.js");

// Discover registered abilities.
const abilitiesSrc = readFileSync(ABILITIES_INDEX, "utf8");
const abilitiesMatch = abilitiesSrc.match(/export const ABILITIES\s*=\s*\{\s*([^}]+)\}/);
if (!abilitiesMatch) {
  console.error("Could not find ABILITIES export in", ABILITIES_INDEX);
  process.exit(1);
}
const abilities = new Set(
  abilitiesMatch[1].split(",").map((s) => s.trim()).filter(Boolean),
);
console.log("Registered abilities:", [...abilities].join(", "));

// Walk catalog folders.
const entries = readdirSync(CATALOG).filter((name) => {
  const full = join(CATALOG, name);
  return statSync(full).isDirectory();
});

const results = [];
let failures = 0;

for (const id of entries) {
  const folder = join(CATALOG, id);
  const idx = join(folder, "index.js");
  if (!existsSync(idx)) {
    failures++;
    results.push({ id, ok: false, reason: "no index.js" });
    continue;
  }
  const src = readFileSync(idx, "utf8");

  const checks = [];
  const want = [
    ["id",        /\bid\s*:\s*["']([^"']+)["']/],
    ["label",     /\blabel\s*:\s*["']([^"']+)["']/],
    ["title",     /\btitle\s*:\s*["']([^"']+)["']/],
    ["buildMesh", /\bbuildMesh\s*:\s*\(\)/],
  ];
  for (const [field, re] of want) {
    const m = src.match(re);
    checks.push({ field, ok: !!m, value: m?.[1] ?? null });
  }

  // Ability check: either `ability: null`, `ability: null,` (absent), or
  // `ability: "name"` where name must be in the ABILITIES set.
  const abilityMatch = src.match(/\bability\s*:\s*(null|["']([^"']+)["'])/);
  let abilityOk = true, abilityVal = null;
  if (abilityMatch) {
    if (abilityMatch[1] === "null") {
      abilityVal = null;
    } else {
      abilityVal = abilityMatch[2];
      abilityOk = abilities.has(abilityVal);
    }
  } else {
    // No ability field — treat as null.
    abilityVal = null;
  }
  checks.push({ field: "ability", ok: abilityOk, value: abilityVal });

  // Catalog entry's folder id must match the declared id field.
  const declaredId = checks.find((c) => c.field === "id")?.value;
  const idMatch = declaredId === id;
  checks.push({ field: "folder↔id", ok: idMatch, value: `${id} == ${declaredId}` });

  const allOk = checks.every((c) => c.ok);
  if (!allOk) failures++;
  results.push({ id, ok: allOk, checks });
}

console.log("\nResults:");
for (const r of results) {
  const status = r.ok ? "✓" : "✗";
  console.log(`  ${status} ${r.id}`);
  if (!r.ok) {
    for (const c of r.checks) {
      if (!c.ok) console.log(`      - ${c.field}: ${c.value}`);
    }
  }
}

console.log(`\nTotal: ${results.length} entries, ${failures} failures.`);
console.log(`ids: ${results.map((r) => r.id).join(", ")}`);

if (failures > 0) process.exit(1);
