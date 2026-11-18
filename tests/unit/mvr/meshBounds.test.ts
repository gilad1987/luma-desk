import { describe, expect, it } from 'vitest';
import { MvrArchive } from '../../../src/mvr/archive/MvrArchive.ts';
import { meshBounds } from '../../../src/mvr/mesh/meshBounds.ts';
import type { MvrWarning } from '../../../src/mvr/MvrWarning.ts';
import { make3ds, makeGlb, makeZip } from '../../shared/index.ts';

const GLB = makeGlb({
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  accessors: [{ min: [0, 0, 0], max: [1, 2, 3] }],
});
const TDS = make3ds([
  [0, 0, 0],
  [100, 200, 300],
]);

/** A fresh archive and warning list, so the per-archive cache never leaks between tests. */
function setup(): { archive: MvrArchive; warnings: MvrWarning[]; warn: (w: MvrWarning) => void } {
  const archive = MvrArchive.open(
    makeZip({ 'set.glb': GLB, 'deck.3ds': TDS, deck: TDS, 'bad.3ds': 'nope', 'mesh.obj': 'v 0 0 0' }),
  );
  const warnings: MvrWarning[] = [];
  return { archive, warnings, warn: (w) => warnings.push(w) };
}

const rounded = (values: readonly number[]): number[] => values.map((v) => Math.round(v) + 0);

describe('meshBounds', () => {
  it('turns a GLB box (m, Y up) into the MVR frame (mm, Z up)', () => {
    const { archive, warn } = setup();
    const box = meshBounds(archive, 'set.glb', warn);
    expect(box && rounded([...box.min, ...box.max])).toEqual([0, -3000, 0, 1000, 0, 2000]);
  });

  it('reads `.3ds` and extension-less files as 3DS in millimetres, Z up, any case', () => {
    const { archive, warn, warnings } = setup();
    const expected = { min: [0, 0, 0], max: [100, 200, 300] };
    expect(meshBounds(archive, 'DECK.3DS', warn)).toEqual(expected);
    expect(meshBounds(archive, 'deck', warn)).toEqual(expected);
    expect(warnings).toEqual([]);
  });

  it('warns `missing-mesh` for a file not in the archive', () => {
    const { archive, warn, warnings } = setup();
    expect(meshBounds(archive, 'gone.3ds', warn)).toBeUndefined();
    expect(warnings.map((w) => [w.code, w.ref])).toEqual([['missing-mesh', 'gone.3ds']]);
  });

  it('warns `bad-mesh` for unreadable or unsupported files', () => {
    const { archive, warn, warnings } = setup();
    expect(meshBounds(archive, 'bad.3ds', warn)).toBeUndefined();
    expect(meshBounds(archive, 'mesh.obj', warn)).toBeUndefined();
    expect(warnings.map((w) => w.code)).toEqual(['bad-mesh', 'bad-mesh']);
  });

  it('reads and warns once per archive and file', () => {
    const { archive, warn, warnings } = setup();
    meshBounds(archive, 'gone.3ds', warn);
    meshBounds(archive, 'gone.3ds', warn);
    expect(warnings).toHaveLength(1);
    expect(meshBounds(archive, 'deck.3ds', warn)).toBe(meshBounds(archive, 'deck.3ds', warn));
  });
});
