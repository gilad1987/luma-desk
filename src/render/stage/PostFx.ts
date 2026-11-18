import { Vector2, type Camera, type Scene, type WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { LazyMvrChain, type MvrChain } from '../post/LazyMvrChain';
import type { SceneDepth } from '../post/SceneDepth';

/**
 * The bloom ("glow") pipeline. With glow off the stage renders straight to the canvas and skips the OutputPass too,
 * which changes the tone path; that difference is kept on purpose (render quirk list, 02 §4.8). An imported MVR
 * stage draws through its own HDR chain (`MvrPostChain`) in both glow states; built-in stages never create it.
 */
export class PostFx {
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly mvr: LazyMvrChain;

  /**
   * Creates the passes in the legacy order (render, bloom, output); creation order is render parity. The MVR chain
   * is a lazy chunk; tests pass their own `createMvrChain`.
   */
  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera, createMvrChain?: () => Promise<MvrChain>) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new Vector2(512, 512), 0.5, 0.45, 0.85);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    const loadMvrChain = async (): Promise<MvrChain> =>
      new (await import('../post/MvrPostChain')).MvrPostChain(renderer, scene, camera);
    this.mvr = new LazyMvrChain(createMvrChain ?? loadMvrChain);
  }

  /** Sets the test for "an MVR stage is shown"; without it every stage draws through the built-in chain. */
  followMvr(isMvrShown: () => boolean): void {
    this.mvr.follow(isMvrShown);
  }

  /**
   * Picks the chain for this frame; call it once per frame, before `render`. True while the MVR chain draws: it
   * then owns the frame in both glow states, so the caller must not render the scene directly.
   */
  selectChain(): boolean {
    return this.mvr.select() !== undefined;
  }

  /** The scene depth of the MVR chain, for the beam pass; undefined while the built-in chain draws. */
  get sceneDepth(): SceneDepth | undefined {
    return this.mvr.current?.sceneDepth;
  }

  /** Resizes the composer and runs bloom at half size, which is what keeps the glow soft and cheap. */
  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloom.setSize(width / 2, height / 2);
    this.mvr.setSize(width, height);
  }

  /** Renders one frame through the chain that `selectChain` picked; only the MVR chain reads `isGlowOn`. */
  render(isGlowOn = true): void {
    const mvrChain = this.mvr.current;
    if (mvrChain) mvrChain.render(isGlowOn);
    else this.composer.render();
  }
}
