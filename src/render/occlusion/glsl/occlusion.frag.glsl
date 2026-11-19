// Ambient occlusion from the scene depth, one value per 2 x 2 depth pixels. The estimator is the one of Scalable
// Ambient Obscurance (McGuire et al. 2012): taps on a spiral in the screen disc of a sphere of uAo.x metres, each
// weighted by how far it stands above the surface and by a smooth fall-off to the rim of the sphere. A tap outside
// the sphere counts nothing, so a figure puts no halo on a wall far behind it.
uniform vec4 uAo; // x radius in metres, y strength, z bias in metres, w the largest radius in depth pixels
uniform float uFloor; // the darkest value

const int TAPS = 8;
const float TURNS = 3.0; // of the spiral: with 8 taps no two fall on one ray
const float TAU = 6.2831853;
// Radius on the screen, in depth pixels, between which the shade fades in: a sphere of a few pixels would shimmer.
const vec2 FADE = vec2(3.0, 10.0);

// A 4 x 4 ordered pattern, 16 levels. It depends on the pixel only, never on time: the image is the same every frame
// and the 4 x 4 blur that follows removes it exactly.
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}

float bayer4(vec2 a) {
  return bayer2(0.5 * a) * 0.25 + bayer2(a);
}

vec3 positionAt(ivec2 pixel) {
  return viewAt(pixel, depthAt(pixel));
}

// The view normal from the depth. On each axis it takes the neighbour nearer in depth, so the normal of a pixel at
// an edge is that of its own face.
vec3 normalAt(ivec2 pixel, vec3 centre) {
  vec3 left = positionAt(pixel - ivec2(1, 0));
  vec3 right = positionAt(pixel + ivec2(1, 0));
  vec3 down = positionAt(pixel - ivec2(0, 1));
  vec3 up = positionAt(pixel + ivec2(0, 1));
  vec3 dx = abs(left.z - centre.z) < abs(right.z - centre.z) ? centre - left : right - centre;
  vec3 dy = abs(down.z - centre.z) < abs(up.z - centre.z) ? centre - down : up - centre;
  return normalize(cross(dx, dy));
}

void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  ivec2 last = textureSize(tDepth, 0) - 1;
  ivec2 pixel = min(cell * 2, last);
  float depth = depthAt(pixel);
  // the far plane is the background: nothing to shade
  if (depth >= 1.0) {
    fragColor = vec4(1.0);
    return;
  }
  vec3 centre = viewAt(pixel, depth);
  float z = -centre.z;
  float reach = uAo.x * 0.5 / (uInvSize.y * uLens.w * z);
  float fade = smoothstep(FADE.x, FADE.y, reach) * uAo.y;
  if (fade <= 0.0) {
    fragColor = vec4(1.0, packDistance(z), 1.0);
    return;
  }
  reach = min(reach, uAo.w);
  vec3 normal = normalAt(pixel, centre);
  float turn = bayer4(vec2(cell)) * TAU;
  float sum = 0.0;
  for (int i = 0; i < TAPS; i++) {
    float t = (float(i) + 0.5) / float(TAPS);
    float angle = t * TURNS * TAU + turn;
    ivec2 tap = clamp(pixel + ivec2(round(vec2(cos(angle), sin(angle)) * t * reach)), ivec2(0), last);
    vec3 v = positionAt(tap) - centre;
    float vv = dot(v, v);
    float inside = max(1.0 - vv / (uAo.x * uAo.x), 0.0);
    // height over the surface per squared distance, times the radius so the strength has no unit
    sum += inside * inside * inside * max((dot(v, normal) - uAo.z) * uAo.x / (vv + 0.0001), 0.0);
  }
  float open = max(1.0 - fade * sum * 5.0 / float(TAPS), uFloor);
  fragColor = vec4(open, packDistance(z), 1.0);
}
