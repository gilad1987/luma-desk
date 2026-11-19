import type { OpticsXyy } from '../../../domain/stage/optics/OpticsFunction';
import type { GdtfFunction } from './GdtfFunction';

/** One `Slot` of a wheel. */
export interface GdtfSlot {
  readonly name: string;
  /** GDTF `Color`, when it is a CIE chromaticity (`parseColorCie`). */
  readonly color?: OpticsXyy;
  /** GDTF `MediaFileName`: "PNG file name without extension", located "in a folder called `./wheels`". */
  readonly mediaFileName?: string;
  /** The number of `Facet` children: above 0 on a prism slot. */
  readonly facets: number;
}

/** One `Wheel` of the `Wheels` collect. */
export interface GdtfWheel {
  readonly name: string;
  readonly slots: readonly GdtfSlot[];
}

/** One `Emitter` or `Filter` of the `PhysicalDescriptions`. */
export interface GdtfEmitter {
  readonly name: string;
  readonly color?: OpticsXyy;
  /** GDTF `DominantWaveLength` in nanometres (emitters only). */
  readonly dominantWaveLength?: number;
}

/** One `Beam` geometry as written: an attribute the file leaves out is absent, not the GDTF default. */
export interface GdtfBeamRead {
  /** The top-level geometry whose tree shows the beam, matched against `GdtfMode.geometry`. */
  readonly root: string;
  /** How often the tree shows it: 1, or the number of `GeometryReference` copies of its template geometry. */
  readonly count: number;
  readonly beamType?: string;
  readonly lampType?: string;
  readonly beamAngle?: number;
  readonly fieldAngle?: number;
  readonly beamRadius?: number;
  readonly rectangleRatio?: number;
  readonly throwRatio?: number;
  readonly luminousFlux?: number;
  readonly powerConsumption?: number;
  readonly colorTemperature?: number;
  readonly cri?: number;
}

/** The optical facts of a GDTF file, as read; `gdtfOptics` turns them into the optics of one mode. */
export interface GdtfOpticsSource {
  /** The channel functions per mode and channel: `functions[m][c]` belongs to `modes[m].channels[c]`. */
  readonly functions: readonly (readonly (readonly GdtfFunction[])[])[];
  readonly wheels: readonly GdtfWheel[];
  readonly emitters: readonly GdtfEmitter[];
  readonly filters: readonly GdtfEmitter[];
  readonly beams: readonly GdtfBeamRead[];
}
