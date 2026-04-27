# Simulacra — sprite brief

**Project:** Simulacra — Mistral AI Hackathon, Finalist.
**Sprite role:** system-diagram prop. A central hub with a small swarm of
low-poly bee satellites, representing the simulation engine coordinating a
population of AI personas.

## Why this sprite

Simulacra's premise — a policy change ripples through a simulated
population of personas — is a hub-and-spoke system. The sprite makes that
system legible: a glowing hub sphere with five bee satellites on a ring
around it. When the `swarm` ability fires, the bees buzz through figure-eight
paths around the hub, literalising "the simulation is running" with more
personality than generic marker dots.

## Silhouette targets

1. Hub sphere — radius 0.30×D, emissive orange glow.
2. Five low-poly bees — each a striped ellipsoid body with dark head/stinger
   and translucent wings, arranged evenly on a ring of radius 0.78×D around
   the hub.

## Ability

`swarm` — 3-second tick animation. Finds every mesh child named
`simulacra_satellite`, then layers orbit, radial sway, tangent sway, vertical
buzz, and body wobble to create a buzzy figure-eight movement around the hub.
Each satellite keeps an immutable base ring position in `userData.swarmBase`,
and the ability restores all bees to that base ring after completion or
cancel so repeated activations stay bounded.
First ability in the catalog that mutates the mesh every frame (stab/topple
are one-shot impulses).
