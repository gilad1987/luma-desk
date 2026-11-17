import { Vector2, type Camera, type Scene, type WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/**
 * The bloom ("glow") pipeline. With glow off the stage renders straight to the canvas and skips the OutputPass too,
 * which changes the tone path; that difference is kept on purpose (render quirk list, 02 §4.8).
 */
export class PostFx {
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;

  /** Creates the passes in the legacy order (render, bloom, output); creation order is render parity. */
  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new Vector2(512, 512), 0.5, 0.45, 0.85);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  /** Resizes the composer and runs bloom at half size, which is what keeps the glow soft and cheap. */
  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloom.setSize(width / 2, height / 2);
  }

  /** Renders one frame through the bloom pipeline. */
  render(): void {
    this.composer.render();
  }
}
