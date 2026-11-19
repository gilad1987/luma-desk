const int MAX_STEPS = 16;

// The march has 8 to 14 samples across a beam, so the gobo sheet is read at mip level 3 (16 texels across a gobo).
// A pattern finer than the sample spacing gives every pixel another part of it, which shows as grain. In the air a
// gobo is out of focus anyway: the shaft keeps its streaks, and the pool (`light.frag.glsl`, level 0) the image.
const float GOBO_LOD = 3.0;

// The gobo at a point of the beam cross-section (`q` in the unit disc), turned by the gobo rotation.
float goboAt(vec2 q) {
  if (vGobo.x < 0.5) return 1.0;
  vec2 turned = vec2(vGobo.y * q.x - vGobo.z * q.y, vGobo.z * q.x + vGobo.y * q.y);
  vec2 cell = vec2(mod(vGobo.x, 4.0), floor(vGobo.x * 0.25));
  // the clamp keeps the filter inside the cell: half a texel of level 3 is 3 % of it. A mask is white, its shape alpha
  return textureLod(tGobo, (cell + clamp(turned * 0.5 + 0.5, 0.04, 0.96)) / vec2(4.0, 2.0), GOBO_LOD).a;
}

// Light scattered to the eye along the ray `co + t d` (relative to the apex) for t in `span`, per unit of
// scattering and peak intensity. The falloff is the law of the photometry core (`illuminance.ts`): 1 / (r^2 + a^2),
// with r the range from the lens and a the distance from the apex to the lens, so a shaft and the pool it makes
// (`light.frag.glsl`) have one level, and far from the lens both are the candela over distance squared of a data
// sheet. It has the closed form of `inverseSquareIntegral`:
//   integral dt / (h^2 + (t + b)^2) = (atan((t1 + b) / h) - atan((t0 + b) / h)) / h,
// with b = cl.d for the ray seen from the lens, and h^2 the squared distance from the lens to the ray plus a^2.
// The samples are spaced evenly in that angle, so they are dense where the beam is bright, and only the smooth
// terms (edge, gobo, haze, extinction) are summed.
// `gain` is the brightest this fragment can be per unit of the integral; a fragment below what the eye sees is cut.
// `steps` is the sample count of this beam (see beam.vert.glsl).
float inScatter(vec3 co, vec3 d, vec2 span, float jitter, float gain, int steps) {
  vec3 axis = vAxis.xyz;
  vec3 up = cross(axis, vSide);
  vec3 cl = co - axis * vApex.w;
  float b = dot(cl, d);
  float h = sqrt(max(dot(cl, cl) - b * b + vApex.w * vApex.w, 1e-4));
  float x0 = span.x + b;
  float x1 = span.y + b;
  float angle0 = atan(x0 / h);
  // the difference of the two atan in one call, which stays exact when h is small
  float sweep = atan(h * (x1 - x0), h * h + x0 * x1);
  if (gain * sweep / h < 0.002) return 0.0;
  float sum = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    if (i >= steps) break;
    float t = h * tan(angle0 + sweep * (float(i) + jitter) / float(steps)) - b;
    t = clamp(t, span.x, span.y);
    vec3 p = co + d * t;
    float z = dot(p, axis);
    float spread = z * vSpan.y;
    vec2 q = vec2(dot(p, vSide), dot(p, up)) / spread;
    // the edge is never sharper than two target pixels, so a narrow beam far away does not alias
    float core = min(vColor.w, 1.0 - 2.0 * uPix * t / spread);
    float light = 1.0 - smoothstep(core, 1.0, length(q));
    // two layers of the noise at sizes with no common period, each drifting its own way at about 0.1 m/s, so the
    // wisps change shape as they move and no pattern repeats along a shaft
    vec3 w = p + vApex.xyz;
    float fine = textureLod(tNoise, w * 0.11 + uHaze.w * vec3(0.012, 0.004, -0.007), 0.0).r;
    float wide = textureLod(tNoise, w.zxy * 0.043 - uHaze.w * vec3(0.004, -0.003, 0.005), 0.0).r;
    float haze = 1.0 + uHaze.z * (fine + wide - 1.0);
    // light is lost on its way from the lens (the part of the way from the apex that is past the lens plane, as
    // in `coneIrradiance.ts`) and on its way to the eye
    float fade = exp(-uHaze.y * (length(p) * (z - vApex.w) / z + t));
    // a beam that ends in the air has no end cap: it fades over its last part
    fade *= 1.0 - vGobo.w * smoothstep(0.55, 1.0, (z - vApex.w) / vSpan.x);
    sum += light * goboAt(q) * haze * fade;
  }
  return sum * sweep / (h * float(steps));
}
