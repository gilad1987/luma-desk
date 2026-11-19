import { ACESFilmicToneMapping, Color, LinearSRGBColorSpace, NoToneMapping, SRGBColorSpace, Vector4 } from 'three';
import { WebGLRenderTarget } from 'three';
import type { ColorRepresentation, ColorSpace, PerspectiveCamera, ToneMapping } from 'three';
import type { StillRendererState } from '../../../../src/render/still/rendererState';

/** The part of a WebGLRenderer the still render touches, as plain fields; it logs pixel ratio changes. */
export class FakeRenderer implements StillRendererState {
  target: WebGLRenderTarget | null = null;
  viewport = new Vector4(0, 0, 800, 600);
  scissor = new Vector4(0, 0, 800, 600);
  scissorTest = false;
  ratio = 2;
  ratioSets = 0;
  clearColor = new Color(0x112233);
  clearAlpha = 1;
  outputColorSpace: ColorSpace = SRGBColorSpace;
  toneMapping: ToneMapping = NoToneMapping;
  toneMappingExposure = 1;
  autoClear = true;
  getRenderTarget = (): WebGLRenderTarget | null => this.target;
  setRenderTarget = (target: WebGLRenderTarget | null): void => void (this.target = target);
  getViewport = (out: Vector4): Vector4 => out.copy(this.viewport);
  setViewport = (v: Vector4 | number): void => void (typeof v === 'number' || this.viewport.copy(v));
  getScissor = (out: Vector4): Vector4 => out.copy(this.scissor);
  setScissor = (v: Vector4 | number): void => void (typeof v === 'number' || this.scissor.copy(v));
  getScissorTest = (): boolean => this.scissorTest;
  setScissorTest = (on: boolean): void => void (this.scissorTest = on);
  getPixelRatio = (): number => this.ratio;
  setPixelRatio = (ratio: number): void => {
    this.ratio = ratio;
    this.ratioSets++;
  };
  getClearColor = (out: Color): Color => out.copy(this.clearColor);
  getClearAlpha = (): number => this.clearAlpha;
  setClearColor = (color: ColorRepresentation, alpha = 1): void => {
    this.clearColor.set(color);
    this.clearAlpha = alpha;
  };
}

/** Every renderer and camera field the state save covers, as plain values to compare. */
export const snapshot = (r: FakeRenderer, c: PerspectiveCamera) => ({
  target: r.target,
  viewport: r.viewport.toArray(),
  scissor: r.scissor.toArray(),
  clear: [r.clearColor.getHex(), r.clearAlpha, r.outputColorSpace],
  rest: [r.scissorTest, r.ratio, r.toneMapping, r.toneMappingExposure, r.autoClear],
  view: c.view === null ? null : { ...c.view },
  pose: [...c.position.toArray(), ...c.quaternion.toArray()],
  lens: [c.aspect, c.near, c.far, c.zoom, c.filmOffset],
  projection: c.projectionMatrix.toArray(),
});

/** Changes every saved field, as a step may, without updating the projection (the restore must do it). */
export function changeEverything(r: FakeRenderer, c: PerspectiveCamera): void {
  r.setRenderTarget(new WebGLRenderTarget(4, 4));
  r.setViewport(new Vector4(1, 2, 3, 4));
  r.setScissor(new Vector4(5, 6, 7, 8));
  r.setScissorTest(true);
  r.setClearColor(0xff0000, 0.25);
  r.outputColorSpace = LinearSRGBColorSpace;
  r.toneMapping = ACESFilmicToneMapping;
  r.toneMappingExposure = 3;
  r.autoClear = false;
  c.setViewOffset(7680, 4320, 1920.3, 1079.6, 1920, 1080);
  Object.assign(c, { aspect: 16 / 9, near: 0.5, far: 9, zoom: 2, filmOffset: 3 });
  c.position.set(1, 2, 3);
  c.quaternion.set(0, 0.6, 0, 0.8);
  c.projectionMatrix.identity();
}
