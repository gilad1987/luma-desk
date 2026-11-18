/**
 * Owns the per-frame cost of drawing trusses and fixtures: a drag draws every frame with one selection, so the picked
 * ids are made into sets once per selection, and no array is made from the design on a frame. Which items get the
 * selection colour is in `topView.test.ts`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { boundsOf } from '../../../../src/domain/stage/bounds';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { BuilderSelection } from '../../../../src/ui/builder/selection';
import { drawFixtures, drawTrusses } from '../../../../src/ui/builder/topViewDrawItems';
import { readPalette } from '../../../../src/ui/builder/topViewPalette';
import { fitTransform } from '../../../../src/ui/builder/topViewTransform';
import { asReal } from '../../../shared/dom';
import { recordingContext } from './topViewSetup';

let built = 0;
/** A `Set` that counts how many are made. */
class CountingSet<T> extends Set<T> {
  constructor(values?: Iterable<T>) {
    super(values);
    built++;
  }
}

const design = createTemplate('theatre');
const size = { width: 448, height: 448 };
const view = fitTransform(boundsOf(design), size);

/** Draws the trusses and fixtures of the theatre with `selection`; returns the recorded context calls. */
function draw(selection: BuilderSelection): unknown[][] {
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (name: string) => name }));
  const { ctx, calls } = recordingContext();
  const scene = { design, selection, view, palette: readPalette(asReal<Element>({})), size };
  drawTrusses(asReal<CanvasRenderingContext2D>(ctx), scene);
  drawFixtures(asReal<CanvasRenderingContext2D>(ctx), scene);
  return calls;
}

describe('drawTrusses and drawFixtures', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('makes the picked-id sets once per selection, not on every frame of a drag', () => {
    vi.stubGlobal('Set', CountingSet);
    const picked = { fixtures: [101], trusses: ['front'] };
    draw(picked);
    built = 0;
    draw(picked);
    draw(picked);
    const sameSelection = built;
    draw({ fixtures: [], trusses: ['front'] });
    expect([sameSelection, built > 0]).toEqual([0, true]);
  });

  it('makes no array from the design trusses or fixtures on a frame', () => {
    const spies = [vi.spyOn(Array.prototype, 'filter'), vi.spyOn(Array.prototype, 'map')];
    draw({ fixtures: [101], trusses: ['front'] });
    const contexts: unknown[] = spies.flatMap((spy) => spy.mock.contexts);
    vi.restoreAllMocks();
    expect(contexts.some((self) => self === design.trusses || self === design.fixtures)).toBe(false);
  });

  it('draws the plain items first and the picked ones last, in the selection colour', () => {
    const calls = draw({ fixtures: [101], trusses: ['front'] });
    const styles = calls
      .filter(([name]) => String(name).endsWith('Style='))
      .map(([name, v]) => `${String(name)}${String(v)}`);
    const picked = calls.slice(calls.findIndex(([name, v]) => name === 'strokeStyle=' && v === '--top-view-selected'));
    expect(styles).toEqual([
      'strokeStyle=--top-view-truss',
      'fillStyle=--top-view-truss',
      'strokeStyle=--top-view-selected',
      'fillStyle=--top-view-selected',
      'fillStyle=--top-view-fixture',
      'fillStyle=--top-view-selected',
    ]);
    expect([picked.filter(([name]) => name === 'stroke').length, calls.at(-2)?.[0], calls.at(-1)?.[0]]).toEqual([
      1,
      'fillStyle=',
      'fillRect',
    ]);
  });
});
