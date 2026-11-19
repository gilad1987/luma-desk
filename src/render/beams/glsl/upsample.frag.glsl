uniform sampler2D tBeams; // the beam target, half the size of the scene
uniform sampler2D tDepth; // scene depth at full resolution
uniform vec2 uProj; // projection terms [2][2] and [3][2]
uniform float uRollOff;

out vec4 fragColor;

float viewDistance(ivec2 pixel) {
  return uProj.y / (texelFetch(tDepth, pixel, 0).r * 2.0 - 1.0 + uProj.x);
}

void main() {
  float here = viewDistance(ivec2(gl_FragCoord.xy));
  // this pixel in the coordinates of the beam target, where a whole number is the centre of a target pixel
  vec2 low = gl_FragCoord.xy * 0.5 - 0.5;
  ivec2 base = ivec2(floor(low));
  vec2 f = low - floor(low);
  ivec2 last = textureSize(tBeams, 0) - 1;
  vec3 sum = vec3(0.0);
  float total = 0.0;
  vec3 nearest = vec3(0.0);
  float least = 1e9;
  for (int k = 0; k < 4; k++) {
    ivec2 offset = ivec2(k & 1, k >> 1);
    ivec2 tap = clamp(base + offset, ivec2(0), last);
    float bilinear = (offset.x == 0 ? 1.0 - f.x : f.x) * (offset.y == 0 ? 1.0 - f.y : f.y);
    // A target pixel marched to the depth of its first depth pixel. `apart` is how far that depth is from the depth
    // of this pixel, as a fraction of it. A tap on the same surface keeps its bilinear weight; one 20 % away counts
    // 10000 times less, so no beam light crosses the edge of a truss or a figure.
    float apart = (viewDistance(tap * 2) - here) / here;
    vec3 light = texelFetch(tBeams, tap, 0).rgb;
    float weight = bilinear / (1e-4 + 25.0 * apart * apart);
    sum += weight * light;
    total += weight;
    if (abs(apart) < least) {
      least = abs(apart);
      nearest = light;
    }
  }
  // Geometry thinner than two pixels (a truss chord) can be missed by all four taps. Their weights are then all
  // small and nearly bilinear, which blends light from four other depths; the tap nearest in depth is the best
  // single guess, so it wins alone.
  vec3 beams = least > 0.1 ? nearest : sum / total;
  // many crossing beams roll off here by their strongest channel, which keeps the hue; the tone curve alone would
  // clip each channel on its own and turn the crossing white. The curve is a ln(1 + x / a): one shaft is unchanged,
  // and every doubling of a large sum adds the same step, so crossing shafts keep their order (see `ROLL_OFF`).
  float strongest = max(beams.r, max(beams.g, beams.b));
  float kept = strongest > 1e-5 ? uRollOff * log(1.0 + strongest / uRollOff) / strongest : 1.0;
  // alpha 0: the blend adds, and the target's alpha is the scene's, not the beams'
  fragColor = vec4(beams * kept, 0.0);
}
