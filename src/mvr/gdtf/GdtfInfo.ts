import type { AttrName } from '../../domain/attributes';

/**
 * One DMX channel of a fixture, placed at its final DMX position. The importer needs only what to patch (break and
 * offset) and what the desk can drive (`attr`); GDTF channel functions and ranges are not read.
 */
export interface GdtfChannel {
  /** The GDTF attribute name as written (`Dimmer`, `ColorAdd_R`), kept so the summary can list unmapped channels. */
  readonly attribute: string;
  /** The desk attribute this channel drives; absent when the desk has no matching attribute. */
  readonly attr?: AttrName;
  /** The GDTF `DMXBreak` (1-based). The caller pairs it with the MVR `Address` breaks by order. */
  readonly dmxBreak: number;
  /** 1-based DMX offsets, most significant first; empty for a virtual channel (`Offset=""`) that has no DMX slot. */
  readonly offset: readonly number[];
}

/**
 * A channel as the GDTF mode lists it, before `GeometryReference` expansion. It keeps its geometry name, because a
 * channel of a referenced geometry is a template that gets one copy per reference.
 */
export interface GdtfModeChannel extends Omit<GdtfChannel, 'dmxBreak'> {
  /** The `Geometry` the channel belongs to. */
  readonly geometry: string;
  /** The `DMXBreak`, or `'overwrite'` when the referencing `GeometryReference` decides it (GDTF `Overwrite`). */
  readonly dmxBreak: number | 'overwrite';
}

/** One DMX mode. Fixtures in an MVR name their mode, and the channel list differs per mode. */
export interface GdtfMode {
  readonly name: string;
  /** The top-level geometry the mode drives; only references under it apply to the mode. */
  readonly geometry: string;
  readonly channels: readonly GdtfModeChannel[];
}

/** Where a `GeometryReference` puts the channels of one `DMXBreak` of the referenced geometry. */
export interface GdtfBreak {
  readonly dmxBreak: number;
  /** The 1-based DMX address of the reference's first channel in that break. */
  readonly dmxOffset: number;
}

/**
 * One `GeometryReference`: an instance of a template geometry (one pixel of a bar). Each instance gets its own copy
 * of the template's channels, shifted by its breaks.
 */
export interface GdtfReference {
  /** The top-level geometry that holds the reference, matched against `GdtfMode.geometry`. */
  readonly root: string;
  /** The name of the referenced (template) geometry. */
  readonly geometry: string;
  /** In file order; for `Overwrite` channels the last one applies, as the GDTF spec says. */
  readonly breaks: readonly GdtfBreak[];
}

/**
 * What the importer reads from one GDTF file: enough to patch a fixture and to pick a desk fixture type. It is plain
 * data, so it can be read once per GDTF and shared by every fixture that uses it.
 */
export interface GdtfInfo {
  /** The archive file name, used as the warning `ref`. */
  readonly fileName: string;
  readonly name: string;
  readonly manufacturer: string;
  /** In file order; the first is the fallback for an empty or unknown MVR mode. */
  readonly modes: readonly GdtfMode[];
  readonly references: readonly GdtfReference[];
  /** True when any `Beam` geometry exists; a fixture without one (a speaker) is not a light. */
  readonly hasBeam: boolean;
  /** The first beam's `BeamType` (`Spot`, `Wash`, `PC`...); GDTF default `Wash`. Absent without a beam. */
  readonly beamType?: string;
  /** The first beam's full `BeamAngle` in degrees; GDTF default 25. Absent without a beam. */
  readonly beamAngle?: number;
}
