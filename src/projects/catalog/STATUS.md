# Catalog status

Rebuilt from Rex's resume (2026-04-24). Eleven entries, driven by the
resume's project list rather than the pre-refactor scrape of
`projects/index.html`.

| id | label | status | date | ability | notes |
|---|---|---|---|---|---|
| amogus | Amogus | built | 2026-04-24 | stab | Cursor Hack London 2026, 2nd place. MCP server for Vibecoding — 4 parallel Claude agents, "emergency meeting" evolutionary scoring. Sprite is the canonical red crewmate. |
| republic | Republic | built | 2026-04-24 | topple | ETH Oxford research intelligence platform. Sprite is the procedural Doric column. |
| olympic-way | Olympic Way | built | 2026-04-24 | pulse | Susquehanna Datathon 2026 1st place. London Underground roundel on plinth; pulse radiates 3–4 markers for 2s. |
| outreach | Outreach | built | 2026-04-24 | null | Claude Hackathon @ Imperial, Top 8 of 130 (solo). 4,994-LSOA choropleth. Sprite is a flat 4×4 heat-map tile. |
| clearpath | ClearPath | built | 2026-04-24 | null | Claude Hackathon @ LSE. NHS cancer waiting-time tool. Sprite is NHS-blue cross + clock face. |
| oliver-wyman | Oliver Wyman Datathon | built | 2026-04-24 | null | Oliver Wyman Datathon 1st place. Marathon regression. Sprite is a stadium track with a 7-point regression trend inside. |
| simulacra | Simulacra | built | 2026-04-24 | swarm | Mistral AI Hackathon Finalist. AI persona simulation engine. Sprite is a glowing orange hub + 5 satellites; swarm rotates satellites around hub for 3s (first tick-based ability). |
| peel | Peel | built | 2026-04-24 | null | Agentic Society Hedera × LSE. Food-waste marketplace. Sprite is 3 produce crates + leaf-coin. |
| arrow | Arrow | built | 2026-04-24 | null | LSE Build. Phala TEE inference marketplace. Sprite is a glowing purple arrow. |
| musicity | Musicity | built | 2026-04-24 | null | Encode AI Hackathon. Sprite is a 3-block skyline + floating music note. |
| peter-network | NUS · @nus.peter (cycles) | built | 2026-04-24 | cycle | Collapsed from 6 Peter entries into one. 6 outfits (3 unis + 3 themes). Cycle ability advances the outfit ring, hot-swaps body colours and emblem, and updates the floating label text. |

## Infrastructure changes

- `src/projects/abilities/index.js` now exports `{ stab, topple, pulse, swarm, cycle }`.
- `src/projects/system.js::_fireAbility` now passes `mesh: slot.meshGroup` into the ability context so tick-based abilities can mutate the sprite directly.
- `src/projects/builders/primitives.js` added: `roundel`, `stadiumTrack`, `crossSlab`, `produceCrate`, `buildingBlock`, `musicNote`, `scrollEmblem`, `briefcaseEmblem`.
- `scripts/validate-catalog.mjs` — Node-runnable structural validator (the project's `src/projects/index.js` uses `import.meta.glob` + esm.sh, which doesn't run under plain Node).
- Slot count unchanged (8) — `scripts/regen-slots.mjs` reported no change.
