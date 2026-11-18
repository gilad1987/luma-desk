import { attr, childElements } from '../../xml/elements';
import { compact, toNumber } from './compact';
import type { GdtfBeamRead } from './GdtfOpticsSource';

/** How many `GeometryReference` steps are followed: a file whose references loop must not hang the import. */
const MAX_REFERENCE_DEPTH = 8;

/**
 * The `Beam` elements the tree under `el` shows, one entry per showing. A `GeometryReference` shows the beams of the
 * geometry it names; the spec: "Only top level geometries are allowed to be referenced."
 */
function beamsUnder(el: Element, tops: ReadonlyMap<string, Element>, depth: number): Element[] {
  if (el.tagName === 'GeometryReference') {
    const target = depth < MAX_REFERENCE_DEPTH ? tops.get(attr(el, 'Geometry') ?? '') : undefined;
    return target ? beamsUnder(target, tops, depth + 1) : [];
  }
  const own = el.tagName === 'Beam' ? [el] : [];
  return [...own, ...childElements(el).flatMap((child) => beamsUnder(child, tops, depth))];
}

function toBeam(beam: Element, root: string, count: number): GdtfBeamRead {
  const number = (name: string): number | undefined => toNumber(attr(beam, name));
  return compact<GdtfBeamRead>({
    root,
    count,
    beamType: attr(beam, 'BeamType') || undefined,
    lampType: attr(beam, 'LampType') || undefined,
    beamAngle: number('BeamAngle'),
    fieldAngle: number('FieldAngle'),
    beamRadius: number('BeamRadius'),
    rectangleRatio: number('RectangleRatio'),
    throwRatio: number('ThrowRatio'),
    luminousFlux: number('LuminousFlux'),
    powerConsumption: number('PowerConsumption'),
    colorTemperature: number('ColorTemperature'),
    cri: number('ColorRenderingIndex'),
  });
}

/**
 * The beams of every top-level geometry tree, with how often the tree shows each: a pixel bar has one `Beam` in a
 * template geometry and one `GeometryReference` per pixel, so its tree shows that beam once per pixel.
 */
export function readBeams(geometries: Element): GdtfBeamRead[] {
  const tops = new Map(childElements(geometries).map((top) => [attr(top, 'Name') ?? '', top]));
  return childElements(geometries).flatMap((top) => {
    const counts = new Map<Element, number>();
    for (const beam of beamsUnder(top, tops, 0)) counts.set(beam, (counts.get(beam) ?? 0) + 1);
    return [...counts].map(([beam, count]) => toBeam(beam, attr(top, 'Name') ?? '', count));
  });
}
