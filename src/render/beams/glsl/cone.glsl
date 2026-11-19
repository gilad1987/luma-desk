// The part [x, y] of the ray `co + t d` that is inside the beam: a cone with its apex at the origin, axis `a` and
// cos^2 of its half angle `k`, cut to the axial range [z0, z1] (lens to end). x > y when the ray misses.
vec2 coneSpan(vec3 co, vec3 d, vec3 a, float k, float z0, float z1) {
  float dv = dot(d, a);
  float cv = dot(co, a);
  float qa = dv * dv - k;
  float qb = dv * cv - k * dot(d, co);
  float qc = cv * cv - k * dot(co, co);
  float disc = qb * qb - qa * qc;
  if (disc < 0.0) {
    // a ray shallower than the cone can miss it. A steeper one always crosses the double cone, so a negative value
    // is rounding (the line passes near the apex) and means a double root, not a miss.
    if (qa <= 0.0) return vec2(1.0, 0.0);
    disc = 0.0;
  }
  // a ray along the cone surface has no quadratic term; a tiny one keeps the division defined
  if (abs(qa) < 1e-7) qa = 1e-7;
  float root = sqrt(disc);
  float near = (-qb - root) / qa;
  float far = (-qb + root) / qa;
  // a ray steeper than the cone (qa > 0) is inside the double cone outside its two roots, and the half in front of
  // the lens is the one it travels towards; a shallower ray is inside between the roots
  vec2 span = qa > 0.0 ? (dv > 0.0 ? vec2(far, 1e9) : vec2(-1e9, near)) : vec2(far, near);
  // the axial cut also removes the mirror cone behind the apex
  float inv = 1.0 / (abs(dv) > 1e-6 ? dv : 1e-6);
  float ta = (z0 - cv) * inv;
  float tb = (z1 - cv) * inv;
  return vec2(max(span.x, min(ta, tb)), min(span.y, max(ta, tb)));
}
