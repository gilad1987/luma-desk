// One instance row: see packBeam.ts.
in vec4 iOrigin; // xyz lens centre, w length
in vec4 iAxis; // xyz unit axis, w tan of the field half angle
in vec4 iColor; // rgb colour times peak intensity, w core fraction
in vec4 iGobo; // x gobo cell, y gobo rotation, z lens radius, w end fade

out vec3 vWorld;
flat out vec4 vApex; // xyz virtual apex behind the lens, w distance from the apex to the lens
flat out vec4 vAxis; // xyz axis, w cos^2 of the field half angle
flat out vec4 vColor;
flat out vec4 vGobo; // x gobo cell, y cos and z sin of the rotation, w end fade
flat out vec3 vSide; // a unit vector across the beam: the x axis of the gobo
flat out vec2 vSpan; // x length, y tan of the field half angle
flat out float vSteps; // the share of the march steps this beam gets, 0.5 to 1

void main() {
  vec3 axis = iAxis.xyz;
  // The world x axis turned by the shortest arc from straight down to the axis: the turn the cone mesh, the body
  // and the pool get (`setFromUnitVectors(DOWN, dir)`), so the gobo in the shaft keeps the frame of the gobo on the
  // floor, also while a mover pans through +-x. Straight up the arc is not defined; three.js turns about z there.
  float fromUp = 1.0 - axis.y;
  vec3 side = fromUp < 1e-6
    ? vec3(-1.0, 0.0, 0.0)
    : normalize(vec3(1.0, 0.0, 0.0) - (axis.x / fromUp) * (axis - vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(axis, side);
  float along = position.z * iOrigin.w;
  // the box is a little wider than the cone, so the soft edge never meets a box face
  float radius = (iGobo.z + along * iAxis.w) * 1.05;
  vWorld = iOrigin.xyz + axis * along + (side * position.x + up * position.y) * radius;
  float lens = iGobo.z / iAxis.w;
  vApex = vec4(iOrigin.xyz - axis * lens, lens);
  vAxis = vec4(axis, 1.0 / (1.0 + iAxis.w * iAxis.w));
  vColor = iColor;
  vGobo = vec4(iGobo.x, cos(iGobo.y), sin(iGobo.y), iGobo.w);
  vSide = side;
  vSpan = vec2(iOrigin.w, iAxis.w);
  // The march costs by the pixels a beam covers. A beam that fills the frame has the camera in or next to it, and
  // the eye sees a smooth veil there, so it gets fewer steps: down to half when its box covers the whole frame.
  // The size is the side of the cone over the squared distance to its nearest point, in units of the frame.
  vec3 toEye = cameraPosition - iOrigin.xyz;
  float nearest = clamp(dot(toEye, axis), 0.0, iOrigin.w);
  float apart = max(length(toEye - axis * nearest), iGobo.z + nearest * iAxis.w);
  float face = iOrigin.w * 2.0 * (iGobo.z + iOrigin.w * iAxis.w);
  float cover = face * projectionMatrix[0][0] * projectionMatrix[1][1] / (4.0 * apart * apart);
  vSteps = 1.0 - 0.5 * smoothstep(0.1, 1.0, cover);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}
