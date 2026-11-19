import { PerspectiveCamera, ShaderMaterial, Vector2 } from 'three';
import type { WebGLRenderer, WebGLRenderTarget } from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import type { StillFrame, StillSampleContext, StillSource } from '../StillSource';

const VERTEX = 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }';

/**
 * The analytic picture, at image point `p` (pixels, y down) of a `size` image:
 * R = p.x / width, a ramp: a symmetric filter leaves a linear ramp as it is, so the reference is (x + 0.5) / width.
 * G = a checker of 0.5 px cells: far above the pixel rate, so the Gaussian filter flattens it to 0.5 (its first
 *     harmonic keeps e^-pi^2 = 5e-5); one sample alone shows full 0/1 aliasing.
 * B = 0.5 + a hash of (pixel, sample) in [-0.2, 0.2]: the stochastic term, mean 0.5, error shrinking as 1/sqrt(n).
 * Every term reads only the image point, so a tile and a whole-image pass give the same bits.
 */
const SAMPLE = `
uniform vec2 size;
uniform vec2 tileOrigin;
uniform float tileHeight;
uniform vec2 jitter;
uniform int sampleIndex;
float hash(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z;
  return float(v.x & 0xffffu) / 65535.0;
}
void main() {
  vec2 pixel = tileOrigin + vec2(gl_FragCoord.x, tileHeight - gl_FragCoord.y);
  vec2 p = pixel + jitter;
  float checker = mod(floor(p.x * 2.0) + floor(p.y * 2.0), 2.0);
  float noise = hash(uvec3(uvec2(pixel), uint(sampleIndex))) - 0.5;
  gl_FragColor = vec4(p.x / size.x, checker, 0.5 + 0.4 * noise, 1.0);
}`;

/** The post of the fake: a plain clamp to [0, 1], no bloom, so the read-back bytes are round(255 * HDR). */
const POST = `
uniform highp sampler2D map;
void main() { gl_FragColor = vec4(clamp(texelFetch(map, ivec2(gl_FragCoord.xy), 0).rgb, 0.0, 1.0), 1.0); }`;

/** A `StillSource` that draws the analytic picture above; for tests and measurements only. */
export class FakeStillSource implements StillSource {
  readonly camera = new PerspectiveCamera(50, 16 / 9, 0.1, 100);
  disposed = false;
  private readonly quad = new FullScreenQuad();
  private readonly uniforms = {
    size: { value: new Vector2() },
    tileOrigin: { value: new Vector2() },
    tileHeight: { value: 0 },
    jitter: { value: new Vector2() },
    sampleIndex: { value: 0 },
    map: { value: null as WebGLRenderTarget['texture'] | null },
  };
  private readonly sampleMaterial = new ShaderMaterial({ vertexShader: VERTEX, fragmentShader: SAMPLE });
  private readonly postMaterial = new ShaderMaterial({ vertexShader: VERTEX, fragmentShader: POST });
  private readonly renderer: WebGLRenderer;

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
    this.sampleMaterial.uniforms = this.uniforms;
    this.postMaterial.uniforms = this.uniforms;
  }

  beginFrame(frame: StillFrame): void {
    this.uniforms.size.value.set(frame.width, frame.height);
  }

  renderSample({ tile, sample, jitter, target }: StillSampleContext): void {
    this.uniforms.tileOrigin.value.set(tile.x, tile.y);
    this.uniforms.tileHeight.value = tile.height;
    this.uniforms.jitter.value.set(jitter[0], jitter[1]);
    this.uniforms.sampleIndex.value = sample;
    this.draw(this.sampleMaterial, target);
  }

  resolvePost(hdrFull: WebGLRenderTarget, out: WebGLRenderTarget): void {
    this.uniforms.map.value = hdrFull.texture;
    this.draw(this.postMaterial, out);
  }

  dispose(): void {
    this.quad.dispose();
    this.sampleMaterial.dispose();
    this.postMaterial.dispose();
    this.disposed = true;
  }

  private draw(material: ShaderMaterial, target: WebGLRenderTarget): void {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.quad.render(this.renderer);
  }
}
