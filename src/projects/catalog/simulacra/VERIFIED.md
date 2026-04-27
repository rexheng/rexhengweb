# Simulacra — silhouette check

| # | Feature | Target | Constants | Pass |
|---|---|---|---|---|
| 1 | Hub | Sphere, 0.30×D, emissive | `hubR=0.30*D`, emissive colour set in build.js | Glowing central node. |
| 2 | 5 satellites | Low-poly bees on ring 0.78×D | `beeBodyR=0.085*D`, `beeBodyLength=0.32*D`, `beeStripeW=0.035*D`, `beeWingW=0.055*D`, `beeWingL=0.13*D`, `satRingR=0.78*D`, `satCount=5` | Five groups named `simulacra_satellite` spaced at `2π/5` around the ring, each containing `primitives.lowPolyBee(...)`. |
| 3 | Bee primitive | Ellipsoid body, dark bands/head/stinger, translucent wings | `lowPolyBee(...)` in `src/projects/builders/primitives.js` uses low segment counts (`SphereGeometry` 10/8 and 8/6, `CylinderGeometry` 8, `CircleGeometry` 6, `ConeGeometry` 6) | Lightweight bee geometry shared through the primitive builder. |

## Ability check

| Ability | Expected | Verified |
|---|---|---|
| `swarm` | Bee satellites buzz around the hub for ~3s with figure-eight movement, then return to the base ring | `abilities/swarm.js` stores each satellite's immutable `userData.swarmBase` (`x`, `y`, `z`, `rotationY`, `rotationZ`, `r`, `a0`), applies orbit plus tangent sway, radial sway, vertical buzz, and rotation wobble from that base per tick, and restores base position/rotation on completion or `cancel()`. |

## Colour checks

| Target | Hex |
|---|---|
| hub | `#ff7138` |
| hubEmissive | `#ffa266` |
| beeBody | `#f5b82e` |
| beeStripe | `#2a1d14` |
| beeHead | `#20140f` |
| beeWing | `#d9f4ff` |

## Structure checks

| Check | Verified |
|---|---|
| Satellite lookup contract | `build.js` preserves the outer group name `simulacra_satellite`, which `swarm.js` still uses for traversal. |
| Source syntax | `node --check src/projects/catalog/simulacra/build.js`, `node --check src/projects/abilities/swarm.js`, and `node --check src/projects/builders/primitives.js` complete with exit 0. |
| Repeated activation boundedness | A deterministic fake-mesh check runs `swarm({ mesh })` to completion repeatedly and verifies final max radius equals the original base radius after every activation. |
| Runtime visual path | Cursor Browser served the worker checkout, spawned Simulacra, opened the project card, and fired `Swarm!`; bees rendered around the central hub and moved with the swarm ability. |

## Wiring

- `ability: "swarm"` → `ABILITIES.swarm`.
- `abilityLabel: "Swarm!"`.
- Source → https://github.com/rexheng/simulacra.
