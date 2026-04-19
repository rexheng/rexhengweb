# GMod-Inspired Features for the MuJoCo Playground

Design date: 2026-04-17. Target iterations: 20–29 of the Ralph loop.

## Why
The playground already has a GMod-flavored physics-gun (click-drag w/ wheel push/pull + right-click freeze, iter 15–17). Extend that identity into a proper toy sandbox: tools, constraints, prop spawning, ragdoll play.

## Non-Goals
- Not recreating Source Engine's constraint solver. We accept visible jitter on soft constraints as the price of runtime flexibility.
- Not building a full Lua-style modding API.
- Not shipping multiplayer.

## Architecture

### ToolGun (new, src/toolgun.js)
Central dispatcher for non-grabber mouse interaction. Owns:
- `activeTool`: string key from {"physgun", "gravgun", "balloon", "thruster", "weld", "rope", "spawner", "remover", "nocollide"}
- `tools`: map of key → tool instance with `onPrimary(hit, ev)`, `onSecondary(hit, ev)`, `reload()`
- Keybinds: digits 1–9 swap `activeTool`; mouse routes through active tool EXCEPT when tool is "physgun" (which defers to the existing Grabber).

### Constraint State (new, src/constraints.js)
Pure-JS soft-constraint manager. Each tick, iterates stored constraints and writes into `data.xfrc_applied` (never overwrites — accumulates with wind/grabber).

Data structures:
```js
balloons: [{ bodyID, lift }]                 // persistent upward force = lift * mass
thrusters: [{ bodyID, dirMJ, mag, active }]  // constant MJ-world force while active
welds: [{ bodyA, bodyB, relPose, k, c }]     // stiff spring pulling B toward its rest pose vs A
ropes: [{ bodyA, bodyB, anchorA, anchorB, restLen, k }]  // distance-capped spring
nocollides: Set<"idA_idB">                   // override via geom_contype/conaffinity
```

Applied inside `animate()` AFTER wind, BEFORE grabber (grabber still overrides for the held body):
```
applyWind → applyConstraints → grabber.apply → stepPhysics
```

### Per-Iteration Scope

| iter | feature | touches |
|------|---------|---------|
| 20 | gravity-gun punt (middle-click during grab) | grabber.js |
| 21 | phys-gun rotate (E/Q while grabbing) | grabber.js |
| 22 | balloon tool | toolgun.js, constraints.js, main.js |
| 23 | thruster tool | toolgun.js, constraints.js, main.js |
| 24 | soft weld | toolgun.js, constraints.js |
| 25 | rope | toolgun.js, constraints.js |
| 26 | prop spawner (extend sandbox.spawnNext w/ picker) | toolgun.js, main.js |
| 27 | remover (stash to z=-50) | toolgun.js |
| 28 | no-collide | constraints.js, main.js |
| 29 | radial tool HUD | toolgun.js + CSS |

## Risks

- **Soft welds jitter under large impulses.** Mitigation: cap relative-velocity damping at ~10× critical; if user reports bounce, tune `k` down.
- **Free-joint detection required** for every tool (thrusters, punts rely on qvel writes like grabber freeze). Most sandbox scenes use freejoints throughout — documented in grabber.js iter 17 comment. If a scene body lacks one (e.g., humanoid limbs), tools degrade gracefully (xfrc still works, qvel writes skipped).
- **Rope collision**: ropes visualized as Lines only — no collision with world. Acceptable for a first cut.

## Testing

Per-iteration manual checks via Playwright MCP when available, else `node --check` on changed files + a smoke test of the humanoid scene. Each commit is atomic and reverts cleanly.

## Open Questions

None that block iter 20. Tool UI styling (iter 29) will be revisited once tools 20–28 are wired up and we can see what the HUD needs to communicate.
