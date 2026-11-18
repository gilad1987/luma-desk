// One instance row of the beams: see packBeam.ts. The light volume has its own length, as light on a surface
// reaches past the point where the beam axis lands.
in vec4 iOrigin; // xyz lens centre, w beam length
in vec4 iAxis; // xyz unit axis, w tan of the field half angle
in vec4 iColor; // rgb colour times peak intensity, w core fraction
in vec4 iGobo; // x gobo cell, y gobo rotation, z lens radius, w 0 when the beam axis lands on scenery
in vec4 iExtra; // x layer of the shadow map or -1, y cosine of the incidence where the axis lands (0: not known)

uniform vec4 uLight; // y radiance per irradiance over the cut level, z the longest range
uniform float uPast; // metres of light past a figure that the axis lands on

flat out vec4 vLens; // xyz lens centre, w lens radius
flat out vec4 vAxis; // xyz axis, w tan of the field half angle
flat out vec4 vColor;
flat out vec4 vGobo; // x gobo cell, y cos and z sin of the rotation, w distance from the virtual apex to the lens
flat out vec3 vSide; // a unit vector across the beam: the x axis of the gobo, as in the beam volume
flat out vec3 vFade; // x where along the axis the light starts to fade, y where it ends, z shadow layer or -1

void main() {
  vec3 axis = iAxis.xyz;
  // The world x axis turned by the shortest arc from straight down to the axis: the frame of the beam volume
  // (`beam.vert.glsl`) and of the cone mesh, so the gobo on the deck lines up with the gobo in the shaft.
  float fromUp = 1.0 - axis.y;
  vec3 side = fromUp < 1e-6
    ? vec3(-1.0, 0.0, 0.0)
    : normalize(vec3(1.0, 0.0, 0.0) - (axis.x / fromUp) * (axis - vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(axis, side);
  float peak = max(iColor.r, max(iColor.g, iColor.b));
  // the volume ends where a facing surface would fall below the cut level
  float range = min(sqrt(peak * uLight.y), uLight.z);
  // A light with a shadow map is cut by the map. Any other light has no shadow, so it ends at the far end of its
  // footprint on the surface it lands on. The rim leaves the virtual apex, `apex` behind the lens, so for incidence
  // i the end is (L + apex) cos(i) / (cos(i) - tan(field) sin(i)) - apex from the lens, and never before the deck
  // behind a figure that the axis lands on. A grazing footprint has no end: the range holds.
  float apex = iGobo.z / iAxis.w;
  if (iGobo.w < 0.5 && iExtra.x < 0.0) {
    float cosine = iExtra.y;
    float spread = iAxis.w * sqrt(max(1.0 - cosine * cosine, 0.0));
    float far = cosine > spread + 1e-3 ? (iOrigin.w + apex) * cosine / (cosine - spread) - apex : range;
    range = min(range, 1.05 * max(far, iOrigin.w + uPast));
  }
  float along = position.z * range;
  // the box is a little wider than the cone, so the soft edge never meets a box face
  float radius = (iGobo.z + along * iAxis.w) * 1.05;
  vec3 world = iOrigin.xyz + axis * along + (side * position.x + up * position.y) * radius;
  vLens = vec4(iOrigin.xyz, iGobo.z);
  vAxis = iAxis;
  vColor = iColor;
  vGobo = vec4(iGobo.x, cos(iGobo.y), sin(iGobo.y), apex);
  vSide = side;
  vFade = vec3(0.95 * range, range, iExtra.x);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
