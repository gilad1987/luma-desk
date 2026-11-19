import type { OpticsFunction, OpticsRgb, OpticsXyy } from './OpticsFunction';

/** One additive emitter channel (`ColorAdd_R`, `ColorAdd_W`...) or one subtractive flag channel (`ColorSub_C`...). */
export interface OpticsEmitter extends OpticsFunction {
  /** The name of the GDTF `Emitter` or `Filter` the function links to. */
  readonly name?: string;
  /** Its colour as the GDTF writes it; absent for a non-visible emitter (UV) or when the file gives none. */
  readonly xyY?: OpticsXyy;
  /** `xyY` as linear sRGB (`xyyToLinearSrgb`). */
  readonly rgb?: OpticsRgb;
  /** The emitter's dominant wavelength in nanometres, when the GDTF states it. */
  readonly dominantWaveLength?: number;
}

/** One slot of a colour, gobo or prism wheel. */
export interface OpticsSlot {
  readonly name: string;
  readonly xyY?: OpticsXyy;
  readonly rgb?: OpticsRgb;
  /**
   * The slot image's file name with its `.png` extension, as it lies under `wheels/` in the GDTF archive. The
   * import result holds the bytes under the key of the GDTF file name and this name (`goboImageKey`).
   */
  readonly image?: string;
  /** The number of prism facets, when the slot has `Facet` children. */
  readonly facets?: number;
  /** The DMX values that select the slot, in the channel's resolution, when a channel set names the slot. */
  readonly dmxFrom?: number;
  readonly dmxTo?: number;
}

/** A wheel and the function that selects its slots. */
export interface OpticsWheel extends OpticsFunction {
  /** The GDTF wheel name. */
  readonly name: string;
  /** In wheel order; GDTF counts slots from 1, so slot index 1 is `slots[0]`. */
  readonly slots: readonly OpticsSlot[];
  /** Gobo wheels only: true when the mode can index or spin the gobos (`Gobo(n)Pos`, `Gobo(n)PosRotate`). */
  readonly rotating?: boolean;
}

/**
 * The colour systems of the fixture; a fixture can have more than one (CMY and a colour wheel). A mode that mixes
 * colour only through indirect attributes (`ColorRGB_*`) gets none: they link no emitter, so the colour they make is
 * not known, and the desk keeps its own colour model (the import reports it as an `indirect` drop).
 */
export interface OpticsColor {
  /** Additive emitters, one per `ColorAdd_*` attribute, in mode order. */
  readonly emitters?: readonly OpticsEmitter[];
  /** Subtractive flags, one per `ColorSub_*` attribute, in mode order. */
  readonly filters?: readonly OpticsEmitter[];
  /** Colour wheels (`Color1`, `Color2`...). */
  readonly wheels?: readonly OpticsWheel[];
  /** Colour temperature correction (`CTO`, `CTB`, `CTC`); `from` and `to` are kelvin when present. */
  readonly correction?: readonly OpticsFunction[];
}

/** Beam shaping and shutter functions. No physical unit is checked here: the values are the file's own. */
export interface OpticsShaping {
  /** Prism wheels (`Prism1`...); a slot's `facets` is the facet count when stated. */
  readonly prisms?: readonly OpticsWheel[];
  /** `Iris`; `from` and `to` are the file's own values, whose unit this import does not check. */
  readonly iris?: OpticsFunction;
  /** `Frost1`... */
  readonly frost?: readonly OpticsFunction[];
  /** The blade and shaper attributes the mode has (`Blade1A`, `Blade1Rot`, `ShaperRot`): presence only. */
  readonly blades?: readonly OpticsFunction[];
  /** `Shutter1`: open and closed. */
  readonly shutter?: OpticsFunction;
  /** `Shutter1Strobe`; `from` and `to` are the flash frequency in hertz when the file states it. */
  readonly strobe?: OpticsFunction;
}
