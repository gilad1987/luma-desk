// An unlit mesh at the place the scene pass drew it: the same products in the same order, so the depth agrees.
void main() {
  vec4 at = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  at = instanceMatrix * at;
  #endif
  gl_Position = projectionMatrix * (modelViewMatrix * at);
}
