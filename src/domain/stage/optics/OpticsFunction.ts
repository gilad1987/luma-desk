/** A CIE 1931 xyY colour as GDTF writes it (`ColorCIE`): x, y, and Y from 0 to 100 relative to the beam's output. */
export type OpticsXyy = readonly [number, number, number];

/** Linear sRGB (D65), each part 0 to 1: not gamma encoded, so a renderer can use it as light. */
export type OpticsRgb = readonly [number, number, number];

/** The DMX slots of one copy of a channel in the fixture's GDTF mode. */
export interface OpticsDrive {
  /** The GDTF `DMXBreak` (1-based); the fixture's MVR addresses pair with breaks by order. */
  readonly dmxBreak: number;
  /**
   * 1-based offsets in the break, most significant byte first. The length is the byte resolution: 1 is 8 bit, 2 is
   * 16 bit. Empty for a virtual channel, which has no DMX slot.
   */
  readonly offset: readonly number[];
}

/**
 * The condition of a function that is active only while another channel is in a DMX range (GDTF `ModeMaster`): a
 * zoom whose range depends on the gobo wheel in the beam.
 */
export interface OpticsCondition {
  /** The GDTF attribute of the master channel (`Gobo2`). */
  readonly attribute: string;
  /** The master's DMX slots; empty when the mode has no channel of that name. */
  readonly drives: readonly OpticsDrive[];
  /** The master's DMX range in which the function is active, in the master's resolution. */
  readonly dmxFrom: number;
  readonly dmxTo: number;
}

/**
 * One GDTF channel function of the fixture's mode: what drives a part of the real device. The physical values are
 * present only when the GDTF writes both, in the unit GDTF gives the attribute (the field that holds the function
 * names it).
 */
export interface OpticsFunction {
  /** The GDTF attribute as written (`Pan`, `ColorAdd_R`, `Gobo1`). */
  readonly attribute: string;
  /** One per copy of the channel, in DMX order: one for a head function, one per pixel for a pixel function. */
  readonly drives: readonly OpticsDrive[];
  /** The first and the last DMX value of the function, in the channel's own resolution (0 to 65535 at 16 bit). */
  readonly dmxFrom: number;
  readonly dmxTo: number;
  /** The physical value at `dmxFrom` (GDTF `PhysicalFrom`), as the file writes it. */
  readonly from?: number;
  /** The physical value at `dmxTo` (GDTF `PhysicalTo`). It may be below `from`: the maker's sign convention is kept. */
  readonly to?: number;
  /** The physical value at the function's `Default` DMX value: the home position of an axis. */
  readonly home?: number;
  /** Absent when the function is always active. */
  readonly when?: OpticsCondition;
  /** The GDTF name of the channel function, kept where it tells variants apart (`FixtureOptics.zoomModes`). */
  readonly label?: string;
}

/** A function whose physical range the GDTF writes and the import found plausible. */
export interface OpticsRange extends OpticsFunction {
  readonly from: number;
  readonly to: number;
}
