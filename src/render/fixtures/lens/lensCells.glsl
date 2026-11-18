#ifdef USE_MAP
  // The cell law of an HDR lens face (`cellShape` in post/lensCells.ts; the powers 3 and 12 are its BODY_POWER and
  // CORE_POWER). x is 0 for a dark lens and on a built-in stage: the face is then the texel times the colour.
  if (uLensCells.x > 0.0) {
    float cell = max(sampledDiffuseColor.r, max(sampledDiffuseColor.g, sampledDiffuseColor.b));
    // Face texels per pixel. A lens far away is filtered to a mean texel, and a power of a mean is not the mean of
    // the power: there the law goes back to the texel itself, which has the same mean, so a small lens keeps its light.
    vec2 texels = fwidth(vMapUv) * vec2(textureSize(map, 0));
    float fine = 1.0 - smoothstep(0.75, 2.5, max(texels.x, texels.y));
    float body = cell * cell * cell;
    float core = body * body * body * body;
    diffuseColor.rgb *= mix(1.0, (uLensCells.x * body + uLensCells.y * core) / max(cell, 0.0001), fine);
  }
#endif
