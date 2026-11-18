import type { OpticsColor, OpticsShaping, OpticsWheel } from './OpticsColor';
import type { OpticsFunction, OpticsRange } from './OpticsFunction';

/** The fixed optics of the fixture's first `Beam` geometry. Every value is the GDTF's own; none is a default. */
export interface OpticsBeam {
  /** GDTF `BeamType`: `Wash`, `Spot`, `None`, `Rectangle`, `PC`, `Fresnel` or `Glow`. */
  readonly beamType?: string;
  /** Full beam angle in degrees (GDTF `BeamAngle`). */
  readonly beamAngle?: number;
  /** Full field angle in degrees (GDTF `FieldAngle`). */
  readonly fieldAngle?: number;
  /** The beam radius at its origin in metres (GDTF `BeamRadius`). */
  readonly beamRadius?: number;
  /** Width over height of a `Rectangle` beam (GDTF `RectangleRatio`); only on that beam type. */
  readonly rectangleRatio?: number;
  /** The throw ratio of a `Rectangle` beam's lens (GDTF `ThrowRatio`); only on that beam type. */
  readonly throwRatio?: number;
}

/** The light output of the fixture. */
export interface OpticsOutput {
  /**
   * Lumens of ONE `Beam` geometry (GDTF `LuminousFlux`): of one pixel on a pixel bar, not of the whole bar. Only when
   * every beam writes the same flux and power, and that flux is plausible for the whole bar but not for one beam, is
   * it the written value divided by the beam count (`beamFlux`). Absent when the lamp cannot give it from its power.
   */
  readonly luminousFlux?: number;
  /** Watts of one `Beam` geometry (GDTF `PowerConsumption`). */
  readonly powerConsumption?: number;
  /** Kelvin (GDTF `ColorTemperature`). */
  readonly colorTemperature?: number;
  /** GDTF `ColorRenderingIndex`, 0 to 100. */
  readonly cri?: number;
  /** GDTF `LampType`: `Discharge`, `Tungsten`, `Halogen` or `LED`. */
  readonly lampType?: string;
  /** How many `Beam` geometries the mode's geometry tree has, each `GeometryReference` copy counted. */
  readonly beamCount: number;
  /** True when the mode drives the beams one by one: a dimmer or colour channel has more than one copy. */
  readonly pixelControl: boolean;
}

/**
 * What the GDTF file says the real device does, for the DMX mode the fixture uses. Plain JSON data: it is saved in
 * the show file. Every field is optional, and an absent field means "the GDTF does not say, or the import does not
 * trust what it says": the consumer then uses the desk type's own value. Nothing here is a guess or a default.
 */
export interface FixtureOptics {
  /** `Dimmer`. */
  readonly dimmer?: OpticsFunction;
  /**
   * `Pan` and `Tilt` in degrees. `from` is the angle at DMX 0 and `to` at full, with the sign the maker wrote: one
   * file has pan -270 to 270, another 270 to -270. `home` is the angle at the default DMX value.
   */
  readonly pan?: OpticsRange;
  readonly tilt?: OpticsRange;
  /**
   * `Zoom` in degrees. GDTF calls it "the spread of the fixture's beam/spot" and does not say whether the value is
   * the beam angle or the field angle, so neither is claimed here.
   */
  readonly zoom?: OpticsRange;
  /**
   * Every `Zoom` function of the mode, when it has more than one: the zoom range of some devices depends on another
   * channel (`when`), such as a beam mode and a spot mode. `zoom` is the one the GDTF makes active by default.
   */
  readonly zoomModes?: readonly OpticsRange[];
  readonly beam?: OpticsBeam;
  readonly output?: OpticsOutput;
  readonly color?: OpticsColor;
  /** Gobo wheels (`Gobo1`...). */
  readonly gobos?: readonly OpticsWheel[];
  readonly shaping?: OpticsShaping;
}
