import { ACESFilmicToneMapping, Color, FogExp2, PCFSoftShadowMap, Scene, WebGLRenderer } from 'three';

/** The WebGL renderer and the scene graph that every render builder adds its objects to. */
export interface StageGraphics {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
}

/**
 * Creates the renderer and the scene. Call it first: three.js object creation order is render parity (decision 24),
 * and the camera, post effects and every venue object come after these two.
 */
export function createStageGraphics(canvas: HTMLCanvasElement): StageGraphics {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new Scene();
  scene.background = new Color(0x01020a);
  scene.fog = new FogExp2(0x05060c, 0.0022);
  return { renderer, scene };
}
