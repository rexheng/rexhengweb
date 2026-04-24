# Simulacra — sprite brief

**Project:** Simulacra — Mistral AI Hackathon, Finalist.
**Sprite role:** system-diagram prop. A central hub with orbiting persona
markers, representing the simulation engine coordinating a population of
AI personas.

## Why this sprite

Simulacra's premise — a policy change ripples through a simulated
population of personas — is a hub-and-spoke system. The sprite makes that
system legible: a glowing hub sphere with five persona satellites on a ring
around it. When the `swarm` ability fires, the satellites orbit the hub,
literalising "the simulation is running".

## Silhouette targets

1. Hub sphere — radius 0.30×D, emissive orange glow.
2. Five satellite capsules — each a cylinder body + small head sphere,
   arranged evenly on a ring of radius 0.75×D around the hub.

## Ability

`swarm` — 3-second tick animation. Rotates every mesh child named
`simulacra_satellite` around the hub at 1.6 rad/s. First ability in the
catalog that mutates the mesh every frame (stab/topple are one-shot
impulses).
