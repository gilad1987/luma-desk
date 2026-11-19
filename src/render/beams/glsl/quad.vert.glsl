void main() {
  // the triangle of the full-screen quad is in clip space already
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
