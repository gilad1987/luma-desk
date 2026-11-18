import type { Feature } from '../../domain/attributes';

/** The phaser shapes the desk offers; the key is stored in show files, so it never changes. */
export type PhaserType =
  'circle' | 'pan' | 'tilt' | 'bally' | 'dimSine' | 'dimChase' | 'dimSaw' | 'flash' | 'rainbow' | 'rgbChase';

/** The features a phaser can drive. A fixture holds at most one running phaser per feature. */
export type PhaserFeature = Extract<Feature, 'pos' | 'dim' | 'color'>;

/** How a phaser type is labelled, which feature it drives, and the size a new instance starts with. */
export interface PhaserTypeSpec {
  readonly name: string;
  readonly feat: PhaserFeature;
  readonly size: number;
}

/** The phaser catalogue. Its key order is the button order in the phaser panel. */
export const PHASER_TYPES: Readonly<Record<PhaserType, PhaserTypeSpec>> = {
  circle: { name: 'Circle', feat: 'pos', size: 22 },
  pan: { name: 'Pan Sweep', feat: 'pos', size: 40 },
  tilt: { name: 'Tilt Bounce', feat: 'pos', size: 28 },
  bally: { name: 'Ballyhoo', feat: 'pos', size: 32 },
  dimSine: { name: 'Dim Wave', feat: 'dim', size: 100 },
  dimChase: { name: 'Dim Chase', feat: 'dim', size: 100 },
  dimSaw: { name: 'Swipe', feat: 'dim', size: 100 },
  flash: { name: 'Random Flash', feat: 'dim', size: 100 },
  rainbow: { name: 'Rainbow', feat: 'color', size: 100 },
  rgbChase: { name: 'Color Chase', feat: 'color', size: 100 },
};

/**
 * One running phaser over an ordered list of fixtures. It is mutable because the programmer and the encoders edit it in
 * place; the key order (type, rate, size, spread, ids) is the order show files are saved in.
 */
export interface PhaserInstance {
  type: PhaserType;
  /** Cycles per bar of four beats. */
  rate: number;
  size: number;
  /** Degrees of phase spread from the first to the last fixture of `ids`. */
  spread: number;
  ids: number[];
}
