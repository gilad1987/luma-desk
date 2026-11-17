import { CanvasTexture, type ColorSpace, type Wrapping } from 'three';

/** Texture settings that differ between the scene's canvas textures; a missing field keeps three's default. */
export interface CanvasTextureOptions {
  /**
   * Required with no default: colour textures (deck, floor, stone, logo, lens, panels) are sRGB, but the gobo and glow
   * masks must stay `NoColorSpace`, and a silent sRGB default would change how bright they render.
   */
  readonly colorSpace: ColorSpace;
  /** Applied to both axes; every tiled texture in the scene tiles the same way on U and V. */
  readonly wrap?: Wrapping;
  readonly repeat?: readonly [u: number, v: number];
  /** Rotation pivot in UV space; gobo textures spin about their middle. */
  readonly center?: readonly [u: number, v: number];
  readonly anisotropy?: number;
}

/** Wraps a painted canvas in a three.js texture with explicit settings, so no call site changes a setting by accident. */
export function createCanvasTexture(canvas: HTMLCanvasElement, options: CanvasTextureOptions): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  if (options.wrap !== undefined) {
    texture.wrapS = options.wrap;
    texture.wrapT = options.wrap;
  }
  if (options.repeat) texture.repeat.set(...options.repeat);
  if (options.center) texture.center.set(...options.center);
  if (options.anisotropy !== undefined) texture.anisotropy = options.anisotropy;
  texture.colorSpace = options.colorSpace;
  return texture;
}
