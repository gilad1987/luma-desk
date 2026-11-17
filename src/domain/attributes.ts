/**
 * The channels a fixture can expose. The names are the keys of cues, presets and the programmer, and show files store
 * them, so they must never change.
 */
export type AttrName = 'dim' | 'pan' | 'tilt' | 'r' | 'g' | 'b' | 'gobo' | 'grot' | 'zoom' | 'strobe';

/**
 * The feature group of an attribute. Tracking, phasers and the programmer release or override a whole group at once,
 * so a pan value and a tilt value always travel together.
 */
export type Feature = 'dim' | 'pos' | 'gobo' | 'color' | 'beam';

/** The range, default and display data of one attribute; faders, encoders and the output merge all read it. */
export interface AttrSpec {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly def: number;
  readonly unit: string;
  readonly feat: Feature;
  /** Set only for attributes that take whole numbers (gobo slots). */
  readonly step?: number;
}

/**
 * Attribute values for one fixture, as a cue, preset or the programmer stores them: an absent key means "not set". A
 * key may also hold `undefined`, because the original code writes it (a fade that keeps a missing value), and stored
 * data keeps such keys.
 */
export type AttrValues = { [K in AttrName]?: number | undefined };

/** The attribute table. Its key order is the order in which panels list the attributes. */
export const ATTR: Readonly<Record<AttrName, AttrSpec>> = {
  dim: { label: 'Dimmer', min: 0, max: 100, def: 0, unit: '%', feat: 'dim' },
  pan: { label: 'Pan', min: -270, max: 270, def: 0, unit: '°', feat: 'pos' },
  tilt: { label: 'Tilt', min: -135, max: 135, def: 0, unit: '°', feat: 'pos' },
  r: { label: 'Red', min: 0, max: 100, def: 100, unit: '%', feat: 'color' },
  g: { label: 'Green', min: 0, max: 100, def: 100, unit: '%', feat: 'color' },
  b: { label: 'Blue', min: 0, max: 100, def: 100, unit: '%', feat: 'color' },
  gobo: { label: 'Gobo', min: 0, max: 7, def: 0, unit: '', feat: 'gobo', step: 1 },
  grot: { label: 'Gobo Rot', min: -100, max: 100, def: 0, unit: '', feat: 'gobo' },
  zoom: { label: 'Zoom', min: 1.5, max: 70, def: 20, unit: '°', feat: 'beam' },
  strobe: { label: 'Shutter', min: 0, max: 100, def: 0, unit: '', feat: 'beam' },
};

/**
 * The feature tabs with their labels, in tab order. `fx` is the phaser tab: it is a tab, not an attribute feature, so
 * it has no entry in {@link FEAT_ATTRS}.
 */
export const FEATS: readonly (readonly [feature: Feature | 'fx', label: string])[] = [
  ['dim', 'Dimmer'],
  ['pos', 'Position'],
  ['gobo', 'Gobo'],
  ['color', 'Color'],
  ['beam', 'Beam'],
  ['fx', 'Phaser'],
];

/** The attributes of each feature, so a feature-wide action (release, phaser) knows which channels it touches. */
export const FEAT_ATTRS: Readonly<Record<Feature, readonly AttrName[]>> = {
  dim: ['dim'],
  pos: ['pan', 'tilt'],
  gobo: ['gobo', 'grot'],
  color: ['r', 'g', 'b'],
  beam: ['zoom', 'strobe'],
};

/** The LED screen content modes; the screen reuses its `gobo` attribute as the index into this list. */
export const SCREEN_MODES: readonly string[] = [
  'Solid',
  'Gradient',
  'Bars',
  'Plasma',
  'Pulse',
  'Grid',
  'Waves',
  'Sparkle',
];

/** The gobo wheel slot names; the `gobo` attribute value is the index into this list. */
export const GOBO_NAMES: readonly string[] = ['Open', 'Dots', 'Breakup', 'Star', 'Bars', 'Shards', 'Rings', 'Flower'];
