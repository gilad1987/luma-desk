// Depth of the caster scene as one light sees it. The camera sits at the beam's apex and looks down its axis
// (see tileFrustum.ts), so the view depth is the `z` of the beam march.
uniform float uInvRange; // 1 / metres from the apex to the end of the beam

out float vDepth;

void main() {
  vec4 local = vec4(position, 1.0);
#ifdef USE_INSTANCING
  local = instanceMatrix * local;
#endif
  vec4 view = viewMatrix * modelMatrix * local;
  vDepth = -view.z * uInvRange;
  gl_Position = projectionMatrix * view;
}
