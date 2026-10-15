# World Labs — asset references

The sprite is a procedural sphere wrapped in vendored Earth textures. No
model file; the textures are the only external assets.

## Textures (`assets/textures/earth/`)

| File | Size (bytes) | Dimensions | Used as | Source URL |
|---|---|---|---|---|
| `earth_atmos_2048.jpg` | 512,606 | 2048×1024 | colour `map` (sRGB) | https://cdn.jsdelivr.net/gh/mrdoob/three.js@r181/examples/textures/planets/earth_atmos_2048.jpg |
| `earth_normal_2048.jpg` | 336,774 | 2048×1024 | tangent-space `normalMap`, scale (0.85, −0.85) as in the three.js example | https://cdn.jsdelivr.net/gh/mrdoob/three.js@r181/examples/textures/planets/earth_normal_2048.jpg |
| `earth_specular_2048.jpg` | 223,421 | 2048×1024 | ocean mask (white = water). Bound as `roughnessMap`; the shader patch inverts it so oceans are glossy and land is matte | https://cdn.jsdelivr.net/gh/mrdoob/three.js@r181/examples/textures/planets/earth_specular_2048.jpg |
| `earth_clouds_1024.png` | 260,222 | 1024×512 | cloud shell `map` (white + alpha) | https://cdn.jsdelivr.net/gh/mrdoob/three.js@r181/examples/textures/planets/earth_clouds_1024.png |

Total: 1,333,023 bytes (about 1.33 MB). Files are byte-identical to the
three.js r181 repository copies (`examples/textures/planets/`), served
through jsDelivr's GitHub mirror.

SHA-256:

```
2faa400d1eade3bc44caf6750d1b772bd9bbb6d87362c02bc7c3304e78fa0a9d  earth_atmos_2048.jpg
3fc43e9639c34e8223c4a871e3bdf5b2d52ee79f7e89ce3f28cba45d4cac031a  earth_normal_2048.jpg
2df48906732d7a458b2d0a7cdec51a829262307c6bdee4cfdf079a4dd7c71c69  earth_specular_2048.jpg
7d3b82ef6b3feb506fc06f02a744aed3d864e23e7417075005f4082a7ff935a4  earth_clouds_1024.png
```

## Licence

- Distributed in the three.js repository (https://github.com/mrdoob/three.js),
  which is MIT licensed (Copyright © 2010-2025 three.js authors).
- The imagery derives from NASA's Blue Marble / Visible Earth collection
  (https://visibleearth.nasa.gov/), which is US-government public domain.
  NASA asks for credit where practical: "Imagery: NASA Visible Earth / Blue
  Marble".

## Scale and look

- Diameter 0.50 MJ-units (`EARTH_RADIUS = 0.25` in `build.js`): a bit
  under the Amogus sprite's 0.6 m height, reads as a big desk globe next to
  the humanoid.
- Axial tilt 23.44°, baked into the sphere geometry so the spawn-time bbox
  stays the bare sphere.
- Cloud shell at 1.012 × radius. The atmosphere is a fresnel rim added to
  the surface material's emissive (no halo mesh).
