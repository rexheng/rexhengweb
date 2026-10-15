# Cultivate — references

## Sprite model: 1903 Wright Flyer

| Field | Value |
|---|---|
| Object | 1903 Wright Flyer, National Air and Space Museum object A19610048000 (credit line: Deposited by the Estate of Orville Wright) |
| Author | Smithsonian Institution: National Air and Space Museum, 3D scan by the Smithsonian Digitization Program Office |
| Licence | **CC0 1.0 (public domain)**, Smithsonian Open Access. 3d.si.edu lists "Restrictions & Rights: CC0", "Usage: CC0". No attribution needed; credited here anyway. |
| Object page | https://3d.si.edu/object/3d/1903-wright-flyer:d8c62e5e-4ebc-11ea-b77f-2e728ce88125 |
| Source file | https://cdn.3d-api.si.edu/d8c62e5e-4ebc-11ea-b77f-2e728ce88125/1903WrightFlyer-100k-2048_std_draco.glb ("Download3D / Low_Resolution GLB", 630 KB, Draco, 100k tris, listed by the 3d-api.si.edu file search for the package) |
| Shipped file | `assets/models/wright-flyer.glb`: 473,600 bytes, about 20k tris, no Draco (the site's GLTFLoader has no Draco decoder) |

### Processing (gltf-transform 4.1, run outside the repo)

1. Decode Draco and weld.
2. Split out the two scanned propellers (triangles inside a slab at glTF
   z∈[-1.40, -1.12], |x ∓ 1.58| < 0.16, y∈[-1.0, 1.72]) into their own nodes
   `prop_L` / `prop_R`, translated to the hub (±1.58, 0.37, -1.24) so a
   local-Z rotation spins them in place.
3. Tint. The scan ships only normal + AO maps and no colour. Airframe gets
   baseColor `[0.8, 0.7, 0.5]` linear (muslin), props get `[0.36, 0.2, 0.085]`
   (spruce). Normal map, AO map and UVs are dropped: they're invisible at
   sprite scale, and the normal map smeared after simplification.
4. Simplify the airframe with meshoptimizer (ratio 0.2, error 0.0015).
5. Recompute normals. Simplification collapses the thin wing skins, so the
   pipeline rebuilds area-weighted smooth normals and gives a flat-shaded copy
   to any corner whose face normal disagrees with them. Without this step the
   wings get dark blotches.
6. Quantize (KHR_mesh_quantization, which three.js reads natively).

Model frame: wingspan along glTF X (12.29 m real), nose toward glTF +Z, up
+Y. The def scales by wingspan (`target: { axis: "x", value: 0.8 }`).
