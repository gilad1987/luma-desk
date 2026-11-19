precision highp sampler2D;

uniform sampler2D tDepth; // scene depth at full resolution
uniform vec2 uProj; // projection terms [2][2] and [3][2]
uniform vec4 uLens; // xy projection terms [2][0] and [2][1], zw 1 / terms [0][0] and [1][1]
uniform vec2 uInvSize; // 1 / size of the depth texture

out vec4 fragColor;

float depthAt(ivec2 pixel) {
  return texelFetch(tDepth, pixel, 0).r;
}

// The view-space position of the scenery in one depth pixel; -z is its distance along the view axis.
vec3 viewAt(ivec2 pixel, float depth) {
  float z = uProj.y / (depth * 2.0 - 1.0 + uProj.x);
  vec2 ndc = (vec2(pixel) + 0.5) * uInvSize * 2.0 - 1.0;
  return vec3((ndc + uLens.xy) * uLens.zw * z, -z);
}
