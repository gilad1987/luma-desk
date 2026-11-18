import { DepthTexture } from 'three';
import { vi } from 'vitest';
import type { MvrChain } from '../../../../src/render/post/LazyMvrChain';

/** An MVR chain that records what its owner asks of it; no GL context behind it. */
export function fakeMvrChain() {
  return {
    sceneDepth: { texture: new DepthTexture(1, 1) },
    setSize: vi.fn<MvrChain['setSize']>(),
    render: vi.fn<MvrChain['render']>(),
    dispose: vi.fn<MvrChain['dispose']>(),
  } satisfies MvrChain;
}
