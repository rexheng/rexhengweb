# Mechanica: asset references

The sprite is one ring of six parts: Wheel → Engine → Axle → Gear → Piston → Spanner.
Three parts come from downloaded CC0 models and three are procedural. All of them
are re-skinned at runtime onto the shared palette in `parts.js` (`PALETTE`), so the
set reads as one family.

## Parts

| Part | Source | Author | Licence | Size |
|---|---|---|---|---|
| Wheel | Kenney Car Kit 3.1, `Models/GLB format/wheel-racing.glb`. https://kenney.nl/assets/car-kit | Kenney (www.kenney.nl) | CC0 1.0 (`License.txt` in the kit) | 29 KB source GLB (+ shared 12 KB `colormap.png`, not shipped); 332 tris |
| Engine | procedural (`buildEngine` in `parts.js`) | Rex Heng site code | Site code (own work) | 0 KB asset; ~7.5k tris |
| Axle | Kenney Car Kit 3.1, `Models/GLB format/debris-drivetrain-axle.glb`. https://kenney.nl/assets/car-kit | Kenney (www.kenney.nl) | CC0 1.0 | 19 KB source GLB; 200 tris |
| Gear | procedural (`buildGear` in `parts.js`) | Rex Heng site code | Site code (own work) | 0 KB asset; ~5k tris |
| Piston | procedural (`buildPiston` in `parts.js`) | Rex Heng site code | Site code (own work) | 0 KB asset; ~5k tris |
| Spanner | Poly Haven "Combination Wrench", 1k glTF. https://polyhaven.com/a/combination_wrench | BKS | CC0 1.0 (all Poly Haven assets) | 66 KB `.bin` geometry (3 × 1k JPG textures dropped); 1,986 tris |

Kenney credit is optional under CC0, but we give it anyway: models by Kenney (www.kenney.nl).
Notes: the wheel is squashed to 72% width in `build.js` so it reads as a bike tyre; the axle
is turned so its shaft runs along z; the spanner drops its textures for a flat steel material.

## Shipped asset

`assets/models/mechanica/mechanica-parts.glb` (84 KB): one GLB with three top-level nodes, `wheel`,
`axle` and `spanner`. It was produced offline by a small stdlib + Pillow script
(`bake_parts.py`, kept outside the repo). The script:

- reads only POSITION / NORMAL / indices from each source (it drops UVs, tangents and textures);
- splits Kenney's colormap-textured meshes into one primitive per colormap cell, with a flat
  `baseColorFactor` (material `k_<hex>`) sampled from that cell;
- writes the wrench as a single primitive with a placeholder steel material.

`parts.js` → `roleForBakedMaterial()` maps those flat colours onto palette roles at runtime
(dark → rubber or dark steel, saturated warm → accent, other → steel).

## Procedural parts

- **Engine**: an air-cooled V-twin. Extruded crankcase and sump, two finned barrels in a 45° V,
  heads with orange rocker covers, side covers with bolts, and a tube exhaust.
- **Gear**: a 16-tooth spur gear made with `ExtrudeGeometry`, with lightening holes, a hub,
  orange hub rings, and a keyed shaft stub through the bore.
- **Piston**: a `LatheGeometry` crown with three ring grooves plus rings, a gudgeon pin, and an
  extruded orange con-rod with big-end cap and bolts.

## Not used

Poly Pizza (the brief's first choice) sits behind a Cloudflare JS challenge from this
environment, for both curl and headless Chromium, so its GLBs could not be fetched.
Khronos' "2 Cylinder Engine" sample was rejected because Khronos removed it from
glTF-Sample-Assets over its licence.
