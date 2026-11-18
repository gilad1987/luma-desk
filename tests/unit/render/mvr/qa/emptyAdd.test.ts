// @vitest-environment jsdom
/**
 * QA of MvrStage.show with nothing to add: a scene with no drawn layer and a failed file placed twice. The bug it
 * guards: `Object3D.add()` called with no arguments, which three.js reports with a console error on every re-import.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';
import { importMvr } from '../../../../../src/mvr/index.ts';
import { MvrStage } from '../../../../../src/render/mvr/MvrStage.ts';
import { exportRoundTrip, meshScene } from '../../../../shared/index.ts';

afterEach(() => vi.restoreAllMocks());

describe('MvrStage.show with nothing to add', () => {
  it('logs no error for a template round trip, which has no layer to draw', async () => {
    const error = vi.spyOn(console, 'error');
    const { result } = await exportRoundTrip(createTemplate('theatre'));
    await new MvrStage().show(result);
    expect(error.mock.calls.map((call) => String(call[0]))).toEqual([]);
  });

  it('logs no error for a file that fails to parse and is placed twice', async () => {
    const error = vi.spyOn(console, 'error');
    const bad = new Uint8Array([1, 2, 3]);
    const result = await importMvr(meshScene([{ file: 'bad.glb' }, { file: 'bad.glb' }], { 'bad.glb': bad }), {
      name: 'x',
    });
    await new MvrStage().show(result);
    expect(error.mock.calls.map((call) => String(call[0]))).toEqual([]);
  });
});
