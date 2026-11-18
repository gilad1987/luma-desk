import { DepthTexture, HalfFloatType, Vector2, WebGLRenderTarget } from 'three';
import type { Camera, IUniform, Scene, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Pass } from 'three/addons/postprocessing/Pass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { MvrChain } from './LazyMvrChain';
import { BLOOM, MVR_EXPOSURE, MVR_TONE_MAPPING, toBufferUnits } from './mvrTone';
import type { SceneDepth } from './SceneDepth';

const MSAA_SAMPLES = 4;

/**
 * The post chain of an imported MVR stage: the scene goes to a half-float HDR target with MSAA and a depth texture,
 * then bloom from radiance above the threshold, then one tone mapping to sRGB, then SMAA for the edges that MSAA
 * leaves (an HDR resolve does not smooth an edge next to an emitter). Glow off skips only the bloom, so both Glow
 * states have the same tone path. Built-in stages never create it.
 */
export class MvrPostChain implements MvrChain {
  readonly sceneDepth: SceneDepth;
  private readonly renderer: WebGLRenderer;
  private readonly scene: Scene;
  private readonly camera: Camera;
  private readonly sceneTarget: WebGLRenderTarget;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly passes: readonly Pass[];

  /** Creates the targets at 1x1; `setSize` gives the real size before the first frame. */
  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.sceneDepth = { texture: new DepthTexture(1, 1) };
    this.sceneTarget = new WebGLRenderTarget(1, 1, {
      type: HalfFloatType,
      samples: MSAA_SAMPLES,
      depthTexture: this.sceneDepth.texture,
    });
    // the composer targets are half-float too and have no MSAA: only the scene pass has geometry edges
    this.composer = new EffectComposer(renderer);
    this.bloom = new UnrealBloomPass(
      new Vector2(256, 256),
      BLOOM.strength,
      BLOOM.radius,
      toBufferUnits(BLOOM.threshold),
    );
    // the pass has a hard 0.01 step by default; a wide step is the soft knee
    const knee = (this.bloom.highPassUniforms as Record<string, IUniform<number>>)['smoothWidth'];
    if (knee) knee.value = toBufferUnits(BLOOM.knee);
    this.passes = [new TexturePass(this.sceneTarget.texture), this.bloom, new OutputPass(), new SMAAPass(1, 1)];
    this.passes.forEach((pass) => this.composer.addPass(pass));
  }

  /** Sizes the scene target to the drawing buffer and runs the bloom at half of it, as the built-in chain does. */
  setSize(width: number, height: number): void {
    const ratio = this.renderer.getPixelRatio();
    const bufferWidth = Math.floor(width * ratio);
    const bufferHeight = Math.floor(height * ratio);
    this.sceneTarget.setSize(bufferWidth, bufferHeight);
    this.composer.setSize(width, height);
    this.bloom.setSize(bufferWidth / 2, bufferHeight / 2);
  }

  /** Draws one frame. The renderer keeps its own tone values, which the built-in chain and the picking use. */
  render(isGlowOn: boolean): void {
    const { renderer } = this;
    renderer.setRenderTarget(this.sceneTarget);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(null);
    this.bloom.enabled = isGlowOn;
    const toneMapping = renderer.toneMapping;
    const exposure = renderer.toneMappingExposure;
    // the output pass reads the tone values from the renderer; a draw to a target has no tone mapping of its own
    renderer.toneMapping = MVR_TONE_MAPPING;
    renderer.toneMappingExposure = MVR_EXPOSURE;
    this.composer.render();
    renderer.toneMapping = toneMapping;
    renderer.toneMappingExposure = exposure;
  }

  /** Frees every target, texture and material, so a stage change leaves nothing in GPU memory. */
  dispose(): void {
    this.sceneTarget.dispose();
    this.sceneDepth.texture.dispose();
    this.composer.dispose();
    this.passes.forEach((pass) => pass.dispose());
  }
}
