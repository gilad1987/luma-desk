import type { AttrName } from './attributes';

/** The fixture type keys. The rig, the 3D model builders and the type-based groups all refer to types by this key. */
export type FixtureTypeId =
  'spot' | 'beam' | 'wash' | 'par' | 'blinder' | 'strobe' | 'bar' | 'follow' | 'profile' | 'screen';

/**
 * What one kind of fixture can do and how it looks. The engine reads the attributes, zoom range and default colour;
 * the renderer reads the rest. Each `model` copies a real product (see the README rig table).
 */
export interface FixtureType {
  readonly name: string;
  /** The key of the procedural 3D model builder; the LED screen has none because the venue draws it. */
  readonly model?: string;
  /**
   * The GDTF file name of the real product this type copies (`Manufacturer@Model.gdtf`). The desk embeds no GDTF, so
   * an MVR export names the file a console fetches from GDTF-Share, and an import maps that name back to this type.
   * Each type's table entry says whether its name and mode were checked against a real GDTF file.
   */
  readonly gdtfSpec?: string;
  /**
   * The DMX mode of `gdtfSpec` that the export names, because the channel layout a console patches depends on it. The
   * MVR spec requires it to match a `DMXMode` name in that GDTF file.
   */
  readonly gdtfMode?: string;
  /** The channels this type has, in channel order. */
  readonly attrs: readonly AttrName[];
  /** The zoom range in degrees; a fixed-beam type has min equal to max. */
  readonly zr: readonly [min: number, max: number];
  /** The zoom output when no cue or programmer value sets one. */
  readonly z0: number;
  readonly power: number;
  /** True for every type that has pan or tilt; position presets and phasers apply only to these. */
  readonly moving: boolean;
  readonly shape: string;
  readonly size?: number;
  readonly beamK?: number;
  /** Beam edge softness: higher is softer. */
  readonly soft?: number;
  /** Lens-glow size factor. */
  readonly glowK?: number;
  /** The output colour, in percent, when nothing sets one (white LEDs are not pure white). */
  readonly defColor?: readonly [r: number, g: number, b: number];
  /** A moving bar with tilt but no pan: aiming can only sweep its own vertical plane. */
  readonly tiltOnly?: boolean;
}
