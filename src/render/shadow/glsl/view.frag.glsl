// The debug view of the atlas: the stored depth as grey, or packed in 16 bits for a read-back.
uniform highp sampler2DShadow tAtlas;
uniform vec4 uRect; // the shown part of the atlas in UV: xy first corner, zw size
uniform float uPack; // 1: red and green hold the high and low byte of the depth

in vec2 vUv;
out highp vec4 outColor;

void main() {
  vec2 uv = uRect.xy + vUv * uRect.zw;
  // The atlas sampler compares and cannot return its depth. Halving the range 16 times finds the depth to the
  // 16 bits the atlas holds: `lo` ends at the largest reference that is still not behind the stored depth.
  float lo = 0.0;
  float hi = 1.0;
  for (int i = 0; i < 16; i++) {
    float mid = 0.5 * (lo + hi);
    if (texture(tAtlas, vec3(uv, mid)) > 0.5) lo = mid;
    else hi = mid;
  }
  float level = floor(lo * 65535.0 + 0.5);
  vec3 packed = vec3(floor(level / 256.0), mod(level, 256.0), 0.0) / 255.0;
  outColor = vec4(mix(vec3(lo), packed, uPack), 1.0);
}
