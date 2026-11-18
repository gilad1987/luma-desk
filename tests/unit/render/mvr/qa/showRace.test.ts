// @vitest-environment jsdom
/**
 * QA of MvrStage's async life cycle: a `dispose` or a second `show` while a build still parses, and layer uuids the
 * stage does not hold. The bug each guards: a late build that adds its layers after `dispose`, or leaks the meshes it
 * built. The draw-call shape of a normal show is owned by MvrStage.test.ts.
 */
import { BufferGeometry } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { importMvr, type MvrImport } from '../../../../../src/mvr/index.ts';
import { MvrStage } from '../../../../../src/render/mvr/MvrStage.ts';
import { make3ds, meshScene } from '../../../../shared/index.ts';

const BOX = make3ds([
  [0, 0, 0],
  [100, 100, 100],
]);
const at = (x: number): string => `{1,0,0}{0,1,0}{0,0,1}{${x},0,0}`;

/** a.3ds twice (instanced) and b.3ds once (merged) in L1, b.3ds once in L2. */
function sceneImport(): Promise<MvrImport> {
  const placements = [
    { file: 'a.3ds', matrix: at(0) },
    { file: 'a.3ds', matrix: at(1000) },
    { file: 'b.3ds', matrix: at(2000) },
    { file: 'b.3ds', matrix: at(3000), layer: 'L2' },
  ];
  return importMvr(meshScene(placements, { 'a.3ds': BOX, 'b.3ds': BOX }), { name: 'race' });
}

/** How many geometries `run` frees. */
async function disposedBy(run: () => Promise<unknown>): Promise<number> {
  const spy = vi.spyOn(BufferGeometry.prototype, 'dispose');
  await run();
  const count = spy.mock.calls.length;
  spy.mockRestore();
  return count;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MvrStage async life cycle', () => {
  it('adds nothing when disposed before show resolves, and frees as much as a full show and dispose', async () => {
    const input = await sceneImport();
    const settled = new MvrStage();
    const full = await disposedBy(async () => {
      await settled.show(input);
      settled.dispose();
    });
    const stage = new MvrStage();
    const early = await disposedBy(async () => {
      const shown = stage.show(input);
      stage.dispose();
      expect(await shown).toEqual([]);
    });
    expect([stage.group.children.length, early]).toEqual([0, full]);
    expect(full).toBeGreaterThan(0);
  });

  it('keeps one set of layers when two shows overlap, and shows again after dispose', async () => {
    const input = await sceneImport();
    const stage = new MvrStage();
    await Promise.all([stage.show(input), stage.show(input)]);
    expect(stage.group.children).toHaveLength(2);
    stage.dispose();
    await stage.show(input);
    expect(stage.group.children).toHaveLength(2);
  });

  it('ignores layer uuids it does not hold and keeps the hidden set for the next show', async () => {
    const input = await sceneImport();
    const stage = new MvrStage();
    stage.setHiddenLayers(['unknown', 'L2']);
    const shown = stage.show(input);
    stage.setHiddenLayers(['unknown', 'L2']);
    await shown;
    expect(stage.group.children.map((layer) => layer.visible)).toEqual([true, false]);
    stage.setHiddenLayers(['nope']);
    expect(stage.group.children.map((layer) => layer.visible)).toEqual([true, true]);
  });
});
