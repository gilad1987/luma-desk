import type { WebGLRenderer } from 'three';
import { MVR_EXPOSURE } from '../../../../src/render/post/mvrTone';
import { METER } from '../../../../src/render/post/showExposure';

/** The bytes of a meter image with every cell at `stops`, as the meter shader writes them. */
export function meterImage(stops: number): Uint8Array {
  const code = Math.round(((stops - METER.low) / (METER.high - METER.low)) * 65535);
  const pixels = new Uint8Array(METER.width * METER.height * 4);
  for (let i = 0; i < pixels.length / 4; i++) pixels.set([code >> 8, code & 255, 0, 255], i * 4);
  return pixels;
}

/** A renderer that draws nothing and whose meter reads `scene.stops`. */
export interface MeterRenderer {
  readonly renderer: WebGLRenderer;
  /** The scene level the next reading gives, in stops. */
  readonly scene: { stops: number };
  readonly readings: () => number;
  /** Every render target the show camera set, in order; 'drawn' is the one of the pass that called it. */
  readonly targets: unknown[];
}

/** Creates the fake renderer of the show camera tests; the scene starts black. */
export function meterRenderer(stops: number = METER.low): MeterRenderer {
  let readings = 0;
  const scene = { stops };
  const targets: unknown[] = [];
  const fake = {
    toneMappingExposure: MVR_EXPOSURE,
    getRenderTarget: () => 'drawn',
    setRenderTarget: (target: unknown) => void targets.push(target),
    render: () => undefined,
    readRenderTargetPixels: (...args: unknown[]) => {
      readings++;
      (args[5] as Uint8Array).set(meterImage(scene.stops));
    },
  };
  return { renderer: fake as unknown as WebGLRenderer, scene, readings: () => readings, targets };
}
