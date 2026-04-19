// Custom post-processing pass — vignette + chromatic aberration + subtle film grain.
// Single fragment shader, applied after UnrealBloomPass, before OutputPass.
//
// Controls exposed via uniforms (all 0..1 unless noted):
//   uVignette   — radial darkening strength. 0 = none, 1 = heavy. Default 0.45.
//   uAberration — RGB channel split in UV space. 0 = none. Default 0.0025.
//   uGrain      — animated noise overlay. 0 = none. Default 0.06.
//   uTime       — seconds, drives grain + subtle breathing of effects.
import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

export const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.45 },
    uAberration: { value: 0.0 },
    uGrain: { value: 0.0 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uAberration;
    uniform float uGrain;
    uniform float uTime;
    varying vec2 vUv;

    // Hash-based 2D noise (no texture lookup)
    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = uv - 0.5;
      float dist = length(center);

      // Chromatic aberration — radial offset grows with distance from center.
      // R pulled outward, B pulled inward, G untouched. Very camera-lens-like.
      float caScale = uAberration * (0.5 + dist * 1.5);
      vec2 dir = center * caScale;
      float r = texture2D(tDiffuse, uv + dir).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - dir).b;
      vec3 col = vec3(r, g, b);

      // Vignette — smooth radial falloff darkening the corners.
      // smoothstep shapes it so center stays bright, then falls off past radius 0.3.
      float vig = smoothstep(0.85, 0.25, dist);
      col *= mix(1.0, vig, uVignette);

      // Film grain — per-pixel, per-frame hash noise. Monochrome so it looks like
      // sensor noise rather than RGB rainbow static.
      float n = hash21(gl_FragCoord.xy + uTime * 37.0);
      col += (n - 0.5) * uGrain;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function makeFilmPass() {
  const pass = new ShaderPass(FilmShader);
  return pass;
}
