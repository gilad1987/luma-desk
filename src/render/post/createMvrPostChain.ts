import type { Camera, Scene, WebGLRenderer } from 'three';
import { MvrPostChain } from './MvrPostChain';
import { smaaReady } from './smaaReady';

/**
 * Creates the MVR post chain and gives it out when it can draw a complete frame: the SMAA pass has its lookup
 * images (`smaaReady`). Until then the stage stays on the built-in chain, as it does while this chunk loads.
 */
export async function createMvrPostChain(renderer: WebGLRenderer, scene: Scene, camera: Camera): Promise<MvrPostChain> {
  const chain = new MvrPostChain(renderer, scene, camera);
  await smaaReady(chain.edges);
  return chain;
}
