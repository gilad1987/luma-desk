import type { Object3D } from 'three';
import type { Disposer } from '../shared';
import type { DeviceVisual, LightVisual } from './FixtureVisual';

/**
 * Takes a light visual out of the scene and hands the disposer what only it owns: the body and lens materials, the
 * beam, pool, glow and pixel-bar materials, and its cloned gobo pool textures. Geometry, model materials, the lens
 * and gobo atlas textures are the kit's, shared by every build, so they are left alone.
 */
export function releaseLightVisual(v: LightVisual, scene: Object3D, disposer: Disposer): void {
  scene.remove(v.g, v.beam, v.pool, v.glow);
  disposer.track(v.bodyMat);
  disposer.track(v.lensMat);
  disposer.track(v.beam.material);
  disposer.track(v.pool.material);
  disposer.track(v.glow.material);
  if (v.pix) {
    scene.remove(v.pix);
    disposer.track(v.pix.material);
  }
  for (const texture of v.poolTex) if (texture) disposer.track(texture);
}

/** Takes a device visual out of the scene; its box geometry and its materials are its own, so the disposer frees them. */
export function releaseDeviceVisual(v: DeviceVisual, scene: Object3D, disposer: Disposer): void {
  scene.remove(v.g);
  disposer.track(v.box.geometry);
  disposer.track(v.box.material);
  disposer.track(v.bodyMat);
  disposer.track(v.lensMat);
}
