/**
 * The proportions of the audience figures against published adult anthropometry, as literal shares of stature
 * (Pheasant and Haslegrave, "Bodyspace", British adults 19 to 65, men and women averaged; the dimensions of
 * ISO 7250-1), measured on the drawn mesh with bands that come from these literals and not from the figure code. The
 * figures were 8 cm too short when seated and their shoulders 11 cm too low: a child's trunk under an adult head.
 */
import { describe, expect, it } from 'vitest';
import { figureGeometry } from '../../../../../src/render/venue/audience/figureGeometry.ts';
import { FIGURES, type FigureSpec } from '../../../../../src/render/venue/audience/FigureSpec.ts';
import { headPivot } from '../../../../../src/render/venue/audience/head.ts';
import { SEAT_TOP } from '../../../../../src/render/venue/audience/legs.ts';
import { MASK } from '../../../../../src/render/venue/audience/loft.ts';

const SITTING_HEIGHT = 0.52;
const SHOULDER_HEIGHT = 0.335;
const SHOULDER_BREADTH = 0.26;
const HIP_BREADTH = 0.21;
const POPLITEAL_HEIGHT = 0.25;
const BUTTOCK_KNEE = 0.34;
/** A measure may differ from its table value by this share. */
const TOLERANCE = 0.05;

interface Vertex {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly mask: number;
  readonly turns: boolean;
}

function vertices(spec: FigureSpec): Vertex[] {
  const geometry = figureGeometry(spec, 'near');
  const [position, part, head] = ['position', 'aPart', 'aHead'].map((name) => geometry.getAttribute(name));
  if (!position || !part || !head) throw new Error('a figure attribute is missing');
  return Array.from({ length: position.count }, (_, i) => ({
    x: position.getX(i),
    y: position.getY(i),
    z: position.getZ(i),
    mask: part.getX(i),
    turns: head.getW(i) === 1,
  }));
}

const spanX = (of: readonly Vertex[]): number => Math.max(...of.map((v) => v.x)) - Math.min(...of.map((v) => v.x));

/** The body measures of a figure in metres, read from its mesh; the origin is on the seat at the seat back. */
function measures(spec: FigureSpec) {
  const all = vertices(spec);
  const acromion = SHOULDER_HEIGHT * spec.stature;
  const hips = all.filter((v) => v.y >= 0 && v.y <= 0.14);
  const knees = all.filter((v) => v.mask === MASK.legs && v.y > -0.06);
  return {
    sittingHeight: Math.max(...all.map((v) => v.y)),
    // across the upper arms, from just under the shoulder point up to it
    shoulderBreadth: spanX(all.filter((v) => v.y > 0.85 * acromion && v.y < 1.03 * acromion)),
    // the top of the shoulder over its outer 7 cm, below the head
    shoulderHeight: Math.max(
      ...all
        .filter((v) => Math.abs(v.x) > (SHOULDER_BREADTH * spec.stature) / 2 - 0.07 && v.y < 0.45 * spec.stature)
        .map((v) => v.y),
    ),
    hipBreadth: spanX(hips),
    buttockKnee: Math.max(...hips.map((v) => v.z)) - Math.min(...knees.map((v) => v.z)),
  };
}

describe('audience figure proportions', () => {
  it.each(FIGURES.map((spec, i) => [i, spec] as const))('figure %i has adult seated proportions', (_, spec) => {
    const body = measures(spec);
    const share = (value: number): number => value / spec.stature;
    expect(Math.abs(share(body.sittingHeight) / SITTING_HEIGHT - 1)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(share(body.shoulderHeight) / SHOULDER_HEIGHT - 1)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(share(body.shoulderBreadth) / SHOULDER_BREADTH - 1)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(share(body.buttockKnee) / BUTTOCK_KNEE - 1)).toBeLessThanOrEqual(TOLERANCE);
    // Hips vary with the build of a person more than with the stature: the table mean for an average build, and the
    // range of adults (0.19 to 0.245 of stature) for every figure.
    expect(share(body.hipBreadth)).toBeGreaterThanOrEqual(0.19);
    expect(share(body.hipBreadth)).toBeLessThanOrEqual(0.245);
    if (Math.abs(spec.build - 1) <= 0.02)
      expect(Math.abs(share(body.hipBreadth) / HIP_BREADTH - 1)).toBeLessThanOrEqual(TOLERANCE);
  });

  it('sits the reference body on a seat of its popliteal height', () => {
    // the proxy seat is one height for everyone, so only the reference stature can fit it
    expect(Math.abs(SEAT_TOP / 1.75 / POPLITEAL_HEIGHT - 1)).toBeLessThanOrEqual(TOLERANCE);
  });

  it('turns only hair with the head below the neck: the long hair of two figures, not a weight error', () => {
    const low = FIGURES.map((spec) => vertices(spec).filter((v) => v.turns && v.y < headPivot(spec)[1] - 0.02));
    expect(low.flat().every((v) => v.mask === MASK.hair)).toBe(true);
    expect(low.flatMap((found, i) => (found.length > 0 ? [FIGURES[i]?.hair] : []))).toEqual(['long', 'long']);
  });
});
