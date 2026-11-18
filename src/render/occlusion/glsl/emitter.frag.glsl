// Marks a pixel where an unlit mesh is the surface the scene shows. The mask has no depth buffer of its own: a
// fragment behind the scene depth is behind another surface (a performer in front of an LED wall) and is dropped.
void main() {
  // the scene depth is one sample of an MSAA pixel, so it differs by the slope of the face, and by its 24 bits
  float slack = 2.0 * fwidth(gl_FragCoord.z) + 0.000002;
  if (gl_FragCoord.z > depthAt(ivec2(gl_FragCoord.xy)) + slack) discard;
  fragColor = vec4(1.0);
}
