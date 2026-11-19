uniform sampler2D tScene; // the HDR scene with its beams, before the bloom and the tone curve

out vec4 fragColor;

void main() {
  // One cell of the meter: the mean of 4 x 4 bilinear taps spread over the part of the frame it covers. The mean is
  // of the radiance, so a lens in a dark cell counts by its light; `showExposure.ts` then averages the brightest
  // cells in stops (the log average of a camera meter: Reinhard et al. 2002, the key of a scene).
  vec2 cell = 1.0 / METER_SIZE;
  vec2 corner = floor(gl_FragCoord.xy) * cell;
  float sum = 0.0;
  for (int k = 0; k < 16; k++) {
    vec2 at = corner + (vec2(float(k & 3), float(k >> 2)) + 0.5) * 0.25 * cell;
    float level = dot(textureLod(tScene, at, 0.0).rgb, vec3(0.2126, 0.7152, 0.0722));
    // a value that is not a number, or an emitter far over white, must not own the reading
    sum += level >= 0.0 ? min(level, METER_MOST) : 0.0;
  }
  float stops = clamp(log2(max(sum / 16.0, 1e-9)), METER_LOW, METER_HIGH);
  // 16 bits over two channels of an 8 bit target, which every WebGL2 device reads back
  float code = floor((stops - METER_LOW) / (METER_HIGH - METER_LOW) * 65535.0 + 0.5);
  float high = floor(code / 256.0);
  fragColor = vec4(high / 255.0, (code - high * 256.0) / 255.0, 0.0, 1.0);
}
