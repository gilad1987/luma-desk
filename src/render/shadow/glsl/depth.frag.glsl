uniform float uSlope; // depth bias in texels of slope

in float vDepth;

void main() {
  // The atlas holds z / range, which is linear in metres: the sampler needs one multiply and no divide, 16 bits
  // give under 2 mm at 100 m, and a bias in metres is the same near and far. The depth of the rasteriser is not
  // linear, so the value is written here. A polygon offset does not apply to a written depth: the slope term
  // stands in for it and moves a surface seen at a slant back by its depth change over `uSlope` texels.
  gl_FragDepth = vDepth + uSlope * fwidth(vDepth);
}
