# Simulacra — silhouette check

| # | Feature | Target | Constants | Pass |
|---|---|---|---|---|
| 1 | Hub | Sphere, 0.30×D, emissive | `hubR=0.30*D`, emissive colour set in build.js | Glowing central node. |
| 2 | 5 satellites | Capsule (cyl + head) on ring 0.75×D | `satR=0.10*D`, `satHeight=0.30*D`, `satRingR=0.75*D`, `satCount=5` | Five groups named `simulacra_satellite` spaced at `2π/5` around the ring. |

## Ability check

| Ability | Expected | Verified |
|---|---|---|
| `swarm` | Satellites orbit the hub for ~3s at ~1.6 rad/s | `abilities/swarm.js` traverses the mesh, captures each satellite's `(r, a0)`, and updates `position.x/z = cos/sin(a0 + ω·t) * r` per tick. Stops at `DURATION_MS=3000`. |

## Colour checks

| Target | Hex |
|---|---|
| hub | `#ff7138` |
| hubEmissive | `#ffa266` |
| satellite | `#b64a12` |
| satelliteHead | `#ffcfa0` |

## Wiring

- `ability: "swarm"` → `ABILITIES.swarm`.
- `abilityLabel: "Swarm!"`.
- Source → https://github.com/rexheng/simulacra.
