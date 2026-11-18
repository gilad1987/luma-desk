// The haze scatters as the two Henyey-Greenstein lobes of the photometry core (`twoLobePhase`), times 4 pi, so an
// even scatter is 1. G_FORWARD, G_BACK and W_FORWARD come from `hazePhase.ts`, the one place for the lobes. The mix
// is normalised (its mean over the sphere is 1): no factor takes light out of one direction, as that would change
// how much the haze scatters and not only where the light goes.
float lobe(float g, float mu) {
  return (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
}

void main() {
  vec3 d = normalize(vWorld - cameraPosition);
  vec3 co = cameraPosition - vApex.xyz;
  vec2 span = coneSpan(co, d, vAxis.xyz, vAxis.w, vApex.w, vApex.w + vSpan.x);
  // one target pixel covers 2 x 2 depth pixels; the upsample reads the same one, so both agree on the scenery
  float depth = texelFetch(tDepth, ivec2(gl_FragCoord.xy) * 2, 0).r;
  vec3 forward = -vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
  // the beam stops at the scenery: view distance of the depth sample, then along this ray
  float scene = uProj.y / (depth * 2.0 - 1.0 + uProj.x) / dot(d, forward);
  span = vec2(max(span.x, 0.0), min(span.y, scene));
  if (span.y <= span.x) discard;
  // interleaved gradient noise: a fixed pattern per pixel that the upsample blurs, so the steps show no bands and
  // no frame depends on an earlier one
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  // the cosine of the angle between the light and the way to the eye
  float mu = -dot(d, vAxis.xyz);
  float phase = mix(lobe(G_BACK, mu), lobe(G_FORWARD, mu), W_FORWARD);
  float gain = uHaze.x * phase;
  float peak = max(vColor.r, max(vColor.g, vColor.b));
  int steps = max(4, int(float(uSteps) * vSteps + 0.5));
  fragColor = vec4(vColor.rgb * (gain * inScatter(co, d, span, jitter, gain * peak, steps)), 1.0);
}
