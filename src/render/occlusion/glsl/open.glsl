// The occlusion image: half the size of the scene depth, r the open part of the hemisphere over a surface (1 in the
// open, less in a corner), gb the view distance of that surface in 16 bits. It follows the depth chunk.
uniform sampler2D tAo;

// Metres that the 16 bits span: 8 mm a step. A surface farther away has no shade to keep apart.
const float AO_RANGE = 500.0;

vec2 packDistance(float z) {
  float steps = clamp(z / AO_RANGE, 0.0, 1.0) * 65535.0;
  float high = floor(steps / 256.0);
  return vec2(high, floor(steps - high * 256.0)) / 255.0;
}

float distanceOf(vec4 texel) {
  return dot(texel.gb, vec2(65280.0, 255.0)) / 65535.0 * AO_RANGE;
}

// The open part at one depth pixel. The four cells around it are weighted by how near their surface is to the one in
// this pixel, so the shade under a figure does not leak onto a wall far behind it, nor the wall's onto the figure.
float openAt(ivec2 pixel) {
  float z = uProj.y / (depthAt(pixel) * 2.0 - 1.0 + uProj.x);
  vec2 at = (vec2(pixel) + 0.5) * 0.5 - 0.5;
  ivec2 base = ivec2(floor(at));
  vec2 part = at - floor(at);
  ivec2 last = textureSize(tAo, 0) - 1;
  float sum = 0.0;
  float weight = 0.0;
  for (int k = 0; k < 4; k++) {
    ivec2 step = ivec2(k & 1, k >> 1);
    vec4 texel = texelFetch(tAo, clamp(base + step, ivec2(0), last), 0);
    vec2 near = mix(1.0 - part, part, vec2(step));
    float w = (near.x * near.y + 0.001) / (0.02 + abs(distanceOf(texel) - z) / z);
    sum += texel.r * w;
    weight += w;
  }
  return sum / weight;
}
