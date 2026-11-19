/** One `ChannelSet`: a named part of a channel function's DMX range, which can select a wheel slot. */
export interface GdtfChannelSet {
  readonly name: string;
  /** The first and the last DMX value, in the resolution of the DMX channel. */
  readonly dmxFrom: number;
  readonly dmxTo: number;
  /** GDTF `WheelSlotIndex`: the 1-based index into the slots of the function's wheel. */
  readonly wheelSlotIndex?: number;
}

/**
 * One `ChannelFunction` of a DMX channel. A DMX channel can have several: the functions of one logical channel split
 * its DMX range, and functions with a `ModeMaster` share the same range. Optional values are absent when the file
 * does not write them; the GDTF defaults (`PhysicalFrom` 0, `PhysicalTo` 1) are not filled in, because a default is
 * not a fact about the device.
 */
export interface GdtfFunction {
  /** GDTF `Attribute`; the spec default is `NoFeature`. */
  readonly attribute: string;
  readonly name?: string;
  /** True when the DMX channel's `InitialFunction` names this function: the one active by default. */
  readonly initial?: true;
  /** The first and the last DMX value of the function, in the resolution of the DMX channel. */
  readonly dmxFrom: number;
  readonly dmxTo: number;
  /** GDTF `Default`, in the resolution of the DMX channel. */
  readonly defaultDmx?: number;
  readonly physicalFrom?: number;
  readonly physicalTo?: number;
  /** The names of the linked `Wheel`, `Emitter` and `Filter`. */
  readonly wheel?: string;
  readonly emitter?: string;
  readonly filter?: string;
  /** GDTF `ModeMaster`, `ModeFrom` and `ModeTo` as written: the function is active only in that range of the master. */
  readonly modeMaster?: string;
  readonly modeFrom?: string;
  readonly modeTo?: string;
  readonly sets: readonly GdtfChannelSet[];
}
