import { decodeAbsolute } from '../patch/address';
import { attr, childElements, descendantElements } from '../xml/elements';
import type { GdtfBreak, GdtfInfo, GdtfReference } from './GdtfInfo';

/** The beam facts of a GDTF, as `GdtfInfo` holds them. */
export type GdtfBeam = Pick<GdtfInfo, 'hasBeam' | 'beamType' | 'beamAngle'>;

/** GDTF defaults for a `Beam` that leaves the attribute out. */
const DEFAULT_BEAM_TYPE = 'Wash';
const DEFAULT_BEAM_ANGLE = 25;

/** A number attribute, or the fallback when it is missing, empty or not a number (`""` must not read as 0). */
function numberAttr(el: Element, name: string, fallback: number): number {
  const text = attr(el, name)?.trim();
  const value = Number(text);
  return text === undefined || text === '' || !Number.isFinite(value) ? fallback : value;
}

/** A `Break`, or `undefined` with a call of `bad` when its `DMXOffset` is not an address of at least 1. */
function toBreak(el: Element, bad: (offset: string) => void): GdtfBreak | undefined {
  const text = attr(el, 'DMXOffset') ?? '1';
  const dmxOffset = decodeAbsolute(text);
  if (dmxOffset !== undefined && dmxOffset >= 1) return { dmxBreak: numberAttr(el, 'DMXBreak', 1), dmxOffset };
  bad(text);
  return undefined;
}

/**
 * Every `GeometryReference` under the top-level geometries, with the top-level name, so a mode can keep only the
 * references of its own geometry tree. A `Break` with an unreadable `DMXOffset` is dropped and reported through
 * `bad`; the mode then reads that reference at offset 1, the default `modeChannels` uses for a missing break.
 */
export function readReferences(geometries: Element, bad: (offset: string) => void): GdtfReference[] {
  return childElements(geometries).flatMap((top) =>
    descendantElements(top, 'GeometryReference').map((reference) => ({
      root: attr(top, 'Name') ?? '',
      geometry: attr(reference, 'Geometry') ?? '',
      breaks: childElements(reference, 'Break').flatMap((el) => toBreak(el, bad) ?? []),
    })),
  );
}

/**
 * The first `Beam` anywhere in the geometry tree. A pixel bar's beams live in a template geometry that only
 * `GeometryReference`s use; the template is a top-level geometry too, so a search of the whole tree finds it.
 */
export function readBeam(geometries: Element): GdtfBeam {
  const beam = descendantElements(geometries, 'Beam')[0];
  if (beam === undefined) return { hasBeam: false };
  return {
    hasBeam: true,
    beamType: attr(beam, 'BeamType') ?? DEFAULT_BEAM_TYPE,
    beamAngle: numberAttr(beam, 'BeamAngle', DEFAULT_BEAM_ANGLE),
  };
}
