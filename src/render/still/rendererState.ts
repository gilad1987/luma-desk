import { Color, Vector4 } from 'three';
import type { PerspectiveCamera, WebGLRenderer } from 'three';

/** The renderer state a still render changes and must give back; a real `WebGLRenderer` fits. */
export type StillRendererState = Pick<
  WebGLRenderer,
  | 'getRenderTarget'
  | 'setRenderTarget'
  | 'getViewport'
  | 'setViewport'
  | 'getScissor'
  | 'setScissor'
  | 'getScissorTest'
  | 'setScissorTest'
  | 'getPixelRatio'
  | 'setPixelRatio'
  | 'getClearColor'
  | 'getClearAlpha'
  | 'setClearColor'
  | 'outputColorSpace'
  | 'toneMapping'
  | 'toneMappingExposure'
  | 'autoClear'
>;

/**
 * The camera state a still render may change: the tile view offset and the output aspect, and (since a step may
 * change state freely) the pose and the projection inputs a source could move.
 */
export type StillCamera = Pick<
  PerspectiveCamera,
  | 'view'
  | 'aspect'
  | 'position'
  | 'quaternion'
  | 'near'
  | 'far'
  | 'zoom'
  | 'filmOffset'
  | 'setViewOffset'
  | 'updateProjectionMatrix'
>;

/** Saves the camera fields of `StillCamera` and returns their restore; the projection is rebuilt from them. */
function saveCameraState(camera: StillCamera): () => void {
  const view = camera.view === null ? null : { ...camera.view };
  const { aspect, near, far, zoom, filmOffset } = camera;
  const position = camera.position.clone();
  const quaternion = camera.quaternion.clone();
  return () => {
    camera.view = view === null ? null : { ...view };
    Object.assign(camera, { aspect, near, far, zoom, filmOffset });
    camera.position.copy(position);
    camera.quaternion.copy(quaternion);
    camera.updateProjectionMatrix();
  };
}

/**
 * Saves the renderer and camera state and returns the function that puts it back. The live frame loop draws
 * between two still steps with the same renderer and camera, so every step restores everything it may change.
 */
export function saveRendererState(renderer: StillRendererState, camera: StillCamera): () => void {
  const target = renderer.getRenderTarget();
  const viewport = renderer.getViewport(new Vector4());
  const scissor = renderer.getScissor(new Vector4());
  const scissorTest = renderer.getScissorTest();
  const pixelRatio = renderer.getPixelRatio();
  const clearColor = renderer.getClearColor(new Color());
  const clearAlpha = renderer.getClearAlpha();
  const { outputColorSpace, toneMapping, toneMappingExposure, autoClear } = renderer;
  const restoreCamera = saveCameraState(camera);
  return () => {
    // setPixelRatio resizes the canvas, so it runs only when a source changed the ratio
    if (renderer.getPixelRatio() !== pixelRatio) renderer.setPixelRatio(pixelRatio);
    renderer.setViewport(viewport);
    renderer.setScissor(scissor);
    renderer.setScissorTest(scissorTest);
    renderer.setClearColor(clearColor, clearAlpha);
    renderer.outputColorSpace = outputColorSpace;
    renderer.toneMapping = toneMapping;
    renderer.toneMappingExposure = toneMappingExposure;
    renderer.autoClear = autoClear;
    // last: binding a target applies that target's own viewport over the one set above, as it did before
    renderer.setRenderTarget(target);
    restoreCamera();
  };
}
