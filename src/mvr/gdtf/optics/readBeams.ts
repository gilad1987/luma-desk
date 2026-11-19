import { attr, childElements } from '../../xml/elements';
import { compact, toNumber } from './compact';
import type { GdtfBeamRead } from './GdtfOpticsSource';

/** How many `GeometryReference` steps are followed: a file whose references loop must not hang the import. */
const MAX_REFERENCE_DEPTH = 8;
/**
 * How many elements the walk of one top-level geometry visits: k references per level of distinct geometries make k^8
 * visits within the depth limit. A 1000-pixel bar takes about 3000, so a real fixture stays far below it. The budget
 * is per top-level geometry, so a tree that spends it does not leave the beams of the next trees unread.
 */
const MAX_STEPS = 100_000;

/** One walk over the geometry trees: the top-level geometries, the ones on the current path and the steps left. */
interface Walk {
  readonly tops: ReadonlyMap<string, Element>;
  /** A reference back to a geometry on the path would show the same beams again and again. */
  readonly path: Set<Element>;
  readonly budget: { left: number };
}

/**
 * The `Beam` elements the tree under `el` shows, one entry per showing. A `GeometryReference` shows the beams of the
 * geometry it names; the spec: "Only top level geometries are allowed to be referenced."
 */
function beamsUnder(el: Element, walk: Walk): Element[] {
  walk.budget.left -= 1;
  if (walk.budget.left < 0) return [];
  if (el.localName === 'GeometryReference') {
    const target = walk.tops.get(attr(el, 'Geometry') ?? '');
    if (!target || walk.path.has(target) || walk.path.size > MAX_REFERENCE_DEPTH) return [];
    walk.path.add(target);
    const beams = beamsUnder(target, walk);
    walk.path.delete(target);
    return beams;
  }
  const own = el.localName === 'Beam' ? [el] : [];
  return [...own, ...childElements(el).flatMap((child) => beamsUnder(child, walk))];
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
    for (const beam of beamsUnder(top, { tops, path: new Set([top]), budget: { left: MAX_STEPS } })) {
      counts.set(beam, (counts.get(beam) ?? 0) + 1);
    }
    return [...counts].map(([beam, count]) => toBeam(beam, attr(top, 'Name') ?? '', count));
  });
}
