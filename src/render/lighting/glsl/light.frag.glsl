// The light of one fixture on the scenery inside its cone: a matt term and a soft highlight from the surface buffers.
uniform sampler2D tNormal; // normal rebuilt from the depth; a is 0 on scenery too thin for it
uniform sampler2D tGNormal; // surface buffers: world normal, a 0 where none, else metalness
uniform sampler2D tGSurface; // surface buffers: base colour, a roughness (0 where no mesh was drawn)
uniform sampler2D tGobo; // 4 x 2 gobo cells
uniform highp sampler2DShadow tShadow; // the shadow maps of the key lights, one tile per layer
uniform mat4 uShadow[8]; // world to tile coordinates and depth, per layer
uniform mat3 uToWorld; // camera rotation: view to world
uniform vec4 uLight; // x radiance per irradiance on white, w the facing term of thin scenery
uniform vec2 uSurface; // x base colour of a surface with no material data, y the darkest base colour

flat in vec4 vLens;
flat in vec4 vAxis;
flat in vec4 vColor;
flat in vec4 vGobo;
flat in vec3 vSide;
flat in vec3 vFade; // x fade start, y end, z shadow layer or -1

// The gobo at a point of the beam cross-section (`q` in the unit disc), turned by the gobo rotation: the cookie.
float goboAt(vec2 q) {
  if (vGobo.x < 0.5) return 1.0;
  vec2 turned = vec2(vGobo.y * q.x - vGobo.z * q.y, vGobo.z * q.x + vGobo.y * q.y);
  vec2 cell = vec2(mod(vGobo.x, 4.0), floor(vGobo.x * 0.25));
  // the clamp keeps the filter inside the cell; a mask is white with its shape in alpha (`GoboAtlas.ts`)
  return textureLod(tGobo, (cell + clamp(turned * 0.5 + 0.5, 0.01, 0.99)) / vec2(4.0, 2.0), 0.0).a;
}

const vec2 TILES = vec2(4.0, 2.0); // the tiles of the shadow atlas: `shadowTile.ts`

// The share of a key light that reaches `world`: four filtered reads of its map. The point moves off the surface
// by about three map pixels, more at a flat angle, so a lit face does not shadow itself.
float shadowAt(vec3 world, vec3 normal, float facing, float along) {
  if (vFade.z < 0.0) return 1.0;
  vec3 point = world + normal * ((0.02 + 0.006 * (along + vGobo.w) * vAxis.w) * (2.0 - facing));
  vec4 clip = uShadow[int(vFade.z)] * vec4(point, 1.0);
  vec3 at = clip.xyz / clip.w;
  vec2 step = 0.75 / vec2(textureSize(tShadow, 0));
  // A map that waits for its turn shows an older pose, so the point can be outside its tile: lit, and never a
  // read of the next tile. The four filtered reads stay 1.5 texels inside.
  vec2 inTile = at.xy * TILES - vec2(mod(vFade.z, TILES.x), floor(vFade.z / TILES.x));
  vec2 edge = 2.0 * step * TILES;
  if (clip.w <= 0.0 || any(lessThan(inTile, edge)) || any(greaterThan(inTile, 1.0 - edge))) return 1.0;
  float lit = texture(tShadow, vec3(at.xy + step * vec2(-1.0, -1.0), at.z));
  lit += texture(tShadow, vec3(at.xy + step * vec2(1.0, -1.0), at.z));
  lit += texture(tShadow, vec3(at.xy + step * vec2(-1.0, 1.0), at.z));
  lit += texture(tShadow, vec3(at.xy + step * vec2(1.0, 1.0), at.z));
  return 0.25 * lit;
}

void main() {
  ivec2 pixel = ivec2(gl_FragCoord.xy);
  float depth = depthAt(pixel);
  // the far plane is the background: no surface to light
  if (depth >= 1.0) discard;
  vec3 world = cameraPosition + uToWorld * viewAt(pixel, depth);
  vec3 rel = world - vLens.xyz;
  float along = dot(rel, vAxis.xyz);
  if (along <= 0.0 || along >= vFade.y) discard;
  vec3 across = rel - vAxis.xyz * along;
  // the cone starts as the lens disc: its apex is behind the lens
  vec2 q = vec2(dot(across, vSide), dot(across, cross(vAxis.xyz, vSide))) / ((along + vGobo.w) * vAxis.w);
  float rim = length(q);
  if (rim >= 1.0) discard;
  vec4 g = texelFetch(tGNormal, pixel, 0);
  vec4 surface = texelFetch(tGSurface, pixel, 0);
  float metal = max(g.a * 255.0 - 1.0, 0.0) / 254.0;
  float trust = 1.0;
  if (g.a == 0.0) {
    g = texelFetch(tNormal, pixel, 0);
    trust = g.a;
  }
  vec3 normal = normalize(g.xyz * 2.0 - 1.0);
  vec3 albedo = surface.a > 0.0 ? max(surface.rgb, uSurface.y) : vec3(uSurface.x);
  // 8-bit normals cannot hold a mirror highlight, so the lobe is never sharper than this
  float rough = surface.a > 0.0 ? max(surface.a, 0.3) : 1.0;
  float dist2 = dot(rel, rel);
  vec3 toLight = -rel * inversesqrt(dist2);
  float facing = mix(uLight.w, max(dot(normal, toLight), 0.0), trust);
  if (facing <= 0.0) discard;
  // full in the core, then a smooth fall to the field angle
  float light = (1.0 - smoothstep(vColor.w, 1.0, rim)) * goboAt(q);
  light *= (1.0 - smoothstep(vFade.x, vFade.y, along)) * shadowAt(world, normal, facing, along);
  vec3 halfway = normalize(toLight + normalize(cameraPosition - world));
  float nh = max(dot(normal, halfway), 0.0);
  float lh = max(dot(toLight, halfway), 0.0);
  float a2 = rough * rough * rough * rough;
  float lobe = nh * nh * (a2 - 1.0) + 1.0;
  // GGX highlight in the units of the matt term (times pi), with the usual cheap visibility term
  float gloss = trust * a2 / (lobe * lobe * max(4.0 * lh * lh, 0.2) * (rough + 0.5));
  // a rough metal on a stage (truss, scaffold) keeps a matt share: oxide and dust
  vec3 reflected = albedo * (1.0 - 0.6 * metal) + mix(vec3(0.04), albedo, metal) * gloss;
  // The law of the photometry core (`illuminance.ts`): the range from the lens and the distance from the virtual
  // apex to the lens, in quadrature. Far away it is the inverse square of the data sheet; at the lens it is finite.
  fragColor = vec4(vColor.rgb * reflected * (uLight.x * light * facing / (dist2 + vGobo.w * vGobo.w)), 1.0);
}
