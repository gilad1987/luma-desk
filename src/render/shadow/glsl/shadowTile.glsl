// The shadow of one beam at a sample of its march. SHADOW_TILES is defined by `shadowTileChunk` (glsl/index.ts);
// the uniforms are the texture and the two arrays of `TileMaps` (tileMaps.ts), which is also the reference.
uniform highp sampler2DShadow tShadowAtlas;
uniform vec4 uShadowTile[SHADOW_TILES]; // xy tile centre in atlas UV, zw atlas UV per unit of q
uniform vec2 uShadowDepth[SHADOW_TILES]; // x 1 / range, y bias, both in depth units

// `q` is the sample across the beam in cone radii and `z` its metres along the axis from the apex, as in
// scatter.glsl; `tile` is the beam's tile or -1. Returns 1 in the light and 0 behind a caster, filtered over 2x2
// texels by the sampler: one fetch per sample.
float beamShadow(vec2 q, float z, int tile) {
  if (tile < 0) return 1.0;
  vec4 map = uShadowTile[tile];
  vec2 depth = uShadowDepth[tile];
  return texture(tShadowAtlas, vec3(map.xy + q * map.zw, z * depth.x - depth.y));
}
