// The world position, normal and texture coordinate of one opaque mesh, for the surface buffers.
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
#include <color_pars_vertex>

void main() {
  mat4 model = modelMatrix;
#ifdef USE_INSTANCING
  model = modelMatrix * instanceMatrix;
#endif
  // The three.js chunks and their names, so a mesh that moves its vertices in its shader (the audience: sway and
  // head turn, `userData.audiencePass`) can add the same code here and its figures get their own normals and colour.
  #include <color_vertex>
  #include <beginnormal_vertex>
  #include <begin_vertex>
  vec4 world = model * vec4(transformed, 1.0);
  vWorld = world.xyz;
  // A normal turns with the cofactors of the placement: the inverse transpose times the determinant. It holds for
  // a stretched or mirrored placement, and it is zero for a flat one (a scale of 0), where `inverse` gives NaN that
  // would spread through the light. The fragment stage takes a zero normal as "no normal" and uses the face.
  mat3 m = mat3(model);
  vec3 turned = mat3(cross(m[1], m[2]), cross(m[2], m[0]), cross(m[0], m[1])) * objectNormal;
  float size = dot(turned, turned);
  vNormal = size > 0.0 ? turned * inversesqrt(size) : vec3(0.0);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * world;
}
