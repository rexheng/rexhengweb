# Peter Network — silhouette + cycle check

## Silhouette (body is constant across all 6 outfits)

| # | Feature | Target | Constants | Pass |
|---|---|---|---|---|
| 1 | Torso | Flat-bottomed capsule, 0.55×D radius, 0.95×D cyl | `buildPeterBody` in build.js | Matches `primitives.peterAvatar` geometry. |
| 2 | Head | Sphere 0.35×D, seated above torso | `headR=0.35*D` | Same position as shared primitive. |
| 3 | Arms | Two stretched spheres at torso side | `arm.scale.set(0.8, 1.5, 0.8)` | Placed at `x = ±(torsoR + 0.06*D)`. |
| 4 | Ground rim | Torus 0.05×D tube | Inline in `buildPeterBody` | Contact shadow. |

## Outfits (6 rows; each `cycle` invocation advances by 1)

| idx | outfit.id | label | body hex | emblem |
|---|---|---|---|---|
| 0 | nus | NUS · @nus.peter | `#ef7d00` | mortarboard |
| 1 | lse | LSE · @lse.peter | `#6b1f5f` | bookstack |
| 2 | cambridge | Cambridge · @cambridge.peter | `#a3152b` | scroll |
| 3 | law | Theme · Law | `#1a1a1a` | scales |
| 4 | finance | Theme · Finance | `#0d3d2a` | barchart |
| 5 | career | Theme · Career | `#1b2a4a` | briefcase |

## Cycle ability check

| Expectation | Verified |
|---|---|
| Instant, no tick loop | `abilities/cycle.js` returns `{ tick() { return false; } }`. |
| Body/accent `.color` swapped, not re-materialised | Cycle calls `bodyMat.color.set(...)` and `accentMat.color.set(...)`. |
| Emblem disposed + replaced | Cycle disposes the old emblem group (`geometry.dispose`, `material.dispose` on every child mesh) before attaching the new one. |
| Label text updated | `slot.labelEl.querySelector('.rex-project-label-text').textContent = outfit.label`. |
| `slot.project.accent` updated | Assigned from `outfit.palette.accent` so re-opening the card shows the new accent. |
| Safe under rapid invocation | Each invocation disposes the previous emblem's geometries and materials; only the persistent body/accent materials survive. |

## Wiring

- `ability: "cycle"` → `ABILITIES.cycle`.
- `abilityLabel: "Cycle"`.
- Initial `accent: "#ef7d00"` (NUS orange), overwritten on first cycle.
- Three Instagram links in `links`.

## Judgment calls

- The shared `primitives.peterAvatar` constructs its own materials
  internally, so I couldn't hot-swap colours through it. The body is
  reconstructed inline in `build.js` using the shared silhouette shape
  but with externally-owned materials — smallest change that makes the
  ability possible without refactoring the shared primitive.
- The mortarboard tassel is a cylinder rather than a braided rope; the
  scales have a cylinder chain rather than linked rings; the briefcase
  drops the latching hardware. All are simplifications that still read
  correctly at sprite scale.
