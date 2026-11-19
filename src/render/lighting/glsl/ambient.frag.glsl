// The light that the lit stage throws back into the hall, in two parts (`bounceTerm.ts` has the numbers and a mirror
// of this term). From the deck: a face that looks down gets the most, the deck itself the least, and a metal
// mirrors it. From the lit stage as a whole: only a face that looks at its centre, less with distance.
uniform sampler2D tNormal; // normal rebuilt from the depth, where the surface buffers have none
uniform sampler2D tGNormal; // surface buffers: world normal, a metalness
uniform sampler2D tGSurface; // surface buffers: base colour and roughness
uniform mat3 uToWorld; // camera rotation: view to world
uniform vec3 uEye; // camera position, world
uniform vec3 uAmbient; // bounce radiance of this frame on a white surface
uniform vec2 uSurface; // x base colour of a surface with no material data, y the darkest base colour
uniform vec3 uBounce; // x metal mirror of the deck part, y stage part as a share, z the most a metal face gets
uniform vec4 uStage; // xyz centre of the lit stage, w distance of half spill (0: no beam landed)

float peakOf(vec3 colour) {
  return max(colour.r, max(colour.g, colour.b));
}

void main() {
  ivec2 pixel = ivec2(gl_FragCoord.xy);
  float depth = depthAt(pixel);
  // the far plane is the background: no surface to light
  if (depth >= 1.0) discard;
  vec4 g = texelFetch(tGNormal, pixel, 0);
  // a is 0 where no mesh was drawn, else (1 + 254 * metalness) / 255
  float metal = max(g.a * 255.0 - 1.0, 0.0) / 254.0;
  if (g.a == 0.0) g = texelFetch(tNormal, pixel, 0);
  vec4 surface = texelFetch(tGSurface, pixel, 0);
  vec3 albedo = surface.a > 0.0 ? max(surface.rgb, uSurface.y) : vec3(uSurface.x);
  vec3 normal = g.xyz * 2.0 - 1.0;
  // the stage part is gated by position: a face behind the stage that looks away from it gets none
  vec3 toStage = uStage.xyz - (uEye + uToWorld * viewAt(pixel, depth));
  float far2 = dot(toStage, toStage);
  float reach2 = uStage.w * uStage.w;
  float facing = max(dot(normal, toStage) * inversesqrt(max(far2, 1e-6)), 0.0);
  vec3 spill = uAmbient * albedo * (uBounce.y * facing * reach2 / max(reach2 + far2, 1e-6));
  vec3 matt = uAmbient * albedo * (0.65 - 0.35 * normal.y);
  vec3 mirrored = matt * (1.0 + uBounce.x * metal);
  // mirror plus spill stay under the cap, so no truss outshines the key; never under the matt value
  float most = max(uBounce.z - peakOf(spill), peakOf(matt));
  mirrored *= min(1.0, most / max(peakOf(mirrored), 1e-6));
  fragColor = vec4(mirrored + spill, 1.0);
  fragColor.rgb *= openAt(pixel); // the bounce does not reach into a corner (`occlusion/glsl/open.glsl`)
}
