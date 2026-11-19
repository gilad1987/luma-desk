// The world normal of the scenery rebuilt from the scene depth: the fallback for pixels where the surface buffers
// hold no normal (a mesh they do not draw, a geometry without normals). It is the face normal.
uniform sampler2D tGNormal; // surface buffers: a is 0 where they hold no normal
uniform mat3 uToWorld; // camera rotation: view to world

void main() {
  ivec2 pixel = ivec2(gl_FragCoord.xy);
  // the readers take the true normal where there is one, so this pixel is never read
  if (texelFetch(tGNormal, pixel, 0).a > 0.0) discard;
  ivec2 last = textureSize(tDepth, 0) - 1;
  ivec2 l = ivec2(max(pixel.x - 1, 0), pixel.y);
  ivec2 r = ivec2(min(pixel.x + 1, last.x), pixel.y);
  ivec2 d = ivec2(pixel.x, max(pixel.y - 1, 0));
  ivec2 u = ivec2(pixel.x, min(pixel.y + 1, last.y));
  vec3 here = viewAt(pixel, depthAt(pixel));
  vec3 left = viewAt(l, depthAt(l));
  vec3 right = viewAt(r, depthAt(r));
  vec3 down = viewAt(d, depthAt(d));
  vec3 up = viewAt(u, depthAt(u));
  // of the two neighbours on an axis, the one nearer in depth is on the same surface; at the border of the image
  // only one neighbour exists
  bool isLeft = pixel.x > 0 && (pixel.x >= last.x || abs(left.z - here.z) < abs(right.z - here.z));
  bool isDown = pixel.y > 0 && (pixel.y >= last.y || abs(down.z - here.z) < abs(up.z - here.z));
  vec3 dx = isLeft ? here - left : right - here;
  vec3 dy = isDown ? here - down : up - here;
  // scenery one pixel thin has no neighbour on its own surface: the step in depth is then large against the
  // distance, the cross product means nothing, and the light pass takes a mean facing term instead
  float gap = max(abs(dx.z), abs(dy.z)) / -here.z;
  float trust = 1.0 - smoothstep(0.03, 0.06, gap);
  vec3 normal = mix(normalize(-here), normalize(cross(dx, dy)), trust);
  fragColor = vec4(normalize(uToWorld * normal) * 0.5 + 0.5, trust);
}
