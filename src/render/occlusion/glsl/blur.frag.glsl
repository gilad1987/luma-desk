// Averages the occlusion over the 4 x 4 cells of its sample pattern, so the pattern leaves no grain. A cell whose
// surface is not near the one in the middle counts less: the shade keeps its edge at the outline of a figure.
uniform vec4 uAo; // x radius in metres

void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  ivec2 last = textureSize(tAo, 0) - 1;
  vec4 centre = texelFetch(tAo, cell, 0);
  float z = distanceOf(centre);
  // surfaces inside one occlusion sphere share their shade; the second term is the depth step of a face seen at a
  // low angle, which grows with the distance
  float slack = uAo.x * 0.5 + 0.03 * z;
  float sum = 0.0;
  float weight = 0.0;
  // -1 to 2: the middle of the box is the middle of the 2 x 2 depth pixels of the cell, where `openAt` puts it
  for (int y = -1; y <= 2; y++) {
    for (int x = -1; x <= 2; x++) {
      vec4 texel = texelFetch(tAo, clamp(cell + ivec2(x, y), ivec2(0), last), 0);
      float w = max(1.0 - abs(distanceOf(texel) - z) / slack, 0.0);
      sum += texel.r * w;
      weight += w;
    }
  }
  fragColor = vec4(sum / max(weight, 0.0001), centre.gb, 1.0);
}
