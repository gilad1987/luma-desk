// Shades the scene colour of the hall light with the occlusion. It runs before the light of the fixtures and the
// beams are added, so neither is shaded: a cone has its own shadow maps, and a shaft is light in the air.
uniform sampler2D tDiffuse; // the HDR scene
uniform sampler2D tMask; // r 1 where the scene shows an unlit mesh (`EmitterMask`)
uniform vec2 uMask; // radiance at which a pixel starts to count as a glow, and at which it is one in full

void main() {
  ivec2 pixel = ivec2(gl_FragCoord.xy);
  vec4 colour = texelFetch(tDiffuse, pixel, 0);
  // An LED wall and a lens make their own light, which no corner takes away: the mask names them. The halo of a lit
  // lens is drawn over its housing with no depth, so the mask does not hold it; it is far above any lit surface.
  float peak = max(colour.r, max(colour.g, colour.b));
  float emitter = max(texelFetch(tMask, pixel, 0).r, smoothstep(uMask.x, uMask.y, peak));
  fragColor = vec4(colour.rgb * mix(openAt(pixel), 1.0, emitter), colour.a);
}
