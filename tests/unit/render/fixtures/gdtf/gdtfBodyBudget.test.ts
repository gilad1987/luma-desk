// @vitest-environment jsdom
/**
 * Owns the triangle limits: a model past the limit of one body, and bodies past the budget of the rig, take the desk
 * model at the GDTF box with a note that gives the count. Also owns the indexed merge. All products are invented.
 */
import { BoxGeometry, Matrix4 } from 'three';
import { describe, expect, it } from 'vitest';
import { GdtfBodyLibrary } from '../../../../../src/render/fixtures/gdtf/index.ts';
import { mergePlain } from '../../../../../src/render/fixtures/gdtf/mergePlain';
import { span, spottoRig } from './spottoRig';

const kinds = (library: GdtfBodyLibrary): string[] =>
  [...library.notes].map(([uuid, notes]) => `${uuid} ${[...notes].join(' ')}`);

describe('GDTF body triangle limits', () => {
  it('draws the desk model at the GDTF box for a model past the limit of one body', async () => {
    const library = new GdtfBodyLibrary();
    await library.load(await spottoRig({ 'models/3ds/head.3ds': span(300, 400, 20_500) }));
    expect([library.protoOf('U-0'), library.boxOf('U-0') !== undefined]).toEqual([undefined, true]);
    expect(kinds(library)).toEqual(['U-0 dense,20502']);
  });

  it('draws the desk model for the bodies past the budget of the rig', async () => {
    const library = new GdtfBodyLibrary(undefined, 10);
    await library.load(await spottoRig({ 'models/3ds/head.3ds': span(300, 400) }, 3));
    expect(library.protoOf('U-0')?.triangles).toBe(4);
    expect([library.protoOf('U-2'), library.boxOf('U-2') !== undefined]).toEqual([undefined, true]);
    expect(kinds(library)).toEqual(['U-2 budget,10']);
  });

  it('keeps the index of the parts it merges', () => {
    const merged = mergePlain([
      { geometry: new BoxGeometry(), matrix: new Matrix4() },
      { geometry: new BoxGeometry().toNonIndexed(), matrix: new Matrix4().makeTranslation(1, 0, 0) },
    ]);
    expect([merged?.getAttribute('position').count, merged?.getIndex()?.count]).toEqual([24 + 36, 36 + 36]);
  });
});
