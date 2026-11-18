// A mesh that writes depth in the scene pass but is no surface for a light (glass, a mesh with several materials).
// It holds its place in the depth of the buffers and writes "no mesh" to both, so the normal and the base colour of
// the mesh behind it are never read at its depth: the reader falls back to the normal it rebuilds from the depth.
layout(location = 0) out highp vec4 gNormal;
layout(location = 1) out highp vec4 gSurface;

void main() {
  gNormal = vec4(0.0);
  gSurface = vec4(0.0);
}
