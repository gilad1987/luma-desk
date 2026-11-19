// What a light needs to know of a surface: its world normal, base colour, roughness and metalness.
uniform vec3 uColor; // base colour, linear
uniform float uRoughness;
uniform float uMetalness;
#ifdef USE_SURFACE_MAP
uniform sampler2D tMap; // base colour map; an sRGB map is decoded by the sampler
uniform float uAlphaTest; // the alpha below which a cut-out (a leaf, a mesh panel) has no surface
#endif

in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
#include <color_pars_fragment>

// rgb world normal * 0.5 + 0.5; a is 0 where no mesh was drawn, else (1 + 254 * metalness) / 255
layout(location = 0) out highp vec4 gNormal;
// rgb base colour; a roughness, never 0 where a mesh was drawn
layout(location = 1) out highp vec4 gSurface;

void main() {
  vec3 albedo = uColor;
#ifdef USE_SURFACE_MAP
  vec4 texel = texture(tMap, vUv);
#ifdef USE_ALPHA_CUT
  // the scene pass cuts the same holes: the surface behind a hole keeps its own normal, colour and shadow
  if (texel.a < uAlphaTest) discard;
#endif
  albedo *= texel.rgb;
#endif
#ifdef USE_COLOR
  // In a fragment stage three.js sets this, and only this, for a mesh with instance colours (the clothes of the
  // crowd; its vertex stage has USE_INSTANCING_COLOR): `color_vertex` hands the colour of the instance over.
  albedo *= vColor.rgb;
#endif
  gSurface = vec4(clamp(albedo, 0.0, 1.0), clamp(uRoughness, 0.04, 1.0));
  // The normal of the drawn face, towards the camera, from the world position: it does not depend on the winding
  // or on the normals of the file, which a CAD export often has inside out.
  vec3 across = cross(dFdx(vWorld), dFdy(vWorld));
  float area = dot(across, across);
  vec3 face = area > 0.0 ? across * inversesqrt(area) : normalize(cameraPosition - vWorld);
  float size = dot(vNormal, vNormal);
#ifdef FLAT_SHADED
  size = 0.0;
#endif
  // the smooth vertex normal, on the side of the face that is seen; a geometry without normals has the face normal
  vec3 normal = size < 1e-12 ? face : vNormal * inversesqrt(size);
  if (dot(normal, face) < 0.0) normal = -normal;
  // a vertex normal that lies along its face is no normal of that face: a broken export
  if (dot(normal, face) < 0.3) normal = face;
  gNormal = vec4(normal * 0.5 + 0.5, (1.0 + 254.0 * clamp(uMetalness, 0.0, 1.0)) / 255.0);
}
