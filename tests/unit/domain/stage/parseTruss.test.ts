/**
 * Owns the truss rules of `parseStageDesign`: unique ids, known role, transform, a known `params.kind` and the fields
 * each kind needs. Each error names the path and the value.
 */
import { describe, expect, it } from 'vitest';
import { parseStageDesign } from '../../../../src/domain/stage/parse/parseStageDesign.ts';
import { errorsOf, SAMPLE } from './parseSample.ts';

const front = { id: 'front', name: 'Front', role: 'front', transform: { position: [0, 7, 2] } };

/** The sample design with its front truss changed by `patch`. */
function withTruss(patch: Record<string, unknown>): unknown {
  return { ...SAMPLE, trusses: [{ ...SAMPLE.trusses[0], ...patch }, ...SAMPLE.trusses.slice(1)] };
}

describe('parseStageDesign trusses', () => {
  it('rejects a duplicate truss id', () => {
    const copy = { ...front, params: { kind: 'roof', size: [1, 1, 1] } };
    expect(errorsOf({ ...SAMPLE, trusses: [...SAMPLE.trusses, copy] })).toEqual([
      'trusses[5].id: duplicate id "front"',
    ]);
  });

  it('rejects an unknown role or params kind', () => {
    expect(errorsOf(withTruss({ role: 'top' }))).toEqual(['trusses[0].role: unknown role "top"']);
    expect(errorsOf(withTruss({ params: { kind: 'arch' } }))).toEqual([
      'trusses[0].params.kind: unknown truss kind "arch"',
    ]);
  });

  it('rejects missing fields for each params kind', () => {
    const cases: [unknown, string][] = [
      [{ kind: 'straight', a: [0, 0, 0], section: 1 }, 'trusses[0].params.b: expected 3 numbers, got undefined'],
      [
        { kind: 'tower', a: [0, 0, 0], b: [0, 1, 0] },
        'trusses[0].params.section: expected a finite number, got undefined',
      ],
      [{ kind: 'circle', section: 1 }, 'trusses[0].params.radius: expected a finite number, got undefined'],
      [{ kind: 'goalpost', width: 1, section: 1 }, 'trusses[0].params.height: expected a finite number, got undefined'],
      [{ kind: 'roof' }, 'trusses[0].params.size: expected 3 numbers, got undefined'],
    ];
    for (const [params, error] of cases) expect(errorsOf(withTruss({ params }))).toEqual([error]);
  });

  it('rejects bad chains and parts by path', () => {
    const line = { kind: 'straight', a: [0, 0, 0], b: [1, 0, 0], section: 1 };
    expect(errorsOf(withTruss({ params: { ...line, chains: [[0, 0]] } }))).toEqual([
      'trusses[0].params.chains[0]: expected 3 numbers, got an array of 2',
    ]);
    const part = { size: [1, 1, 1], at: [0, 0, 0], material: 'gold' };
    expect(errorsOf(withTruss({ params: { ...line, parts: [part] } }))).toEqual([
      'trusses[0].params.parts[0].material: unknown material "gold"',
    ]);
    const ring = { kind: 'circle', radius: 3, section: 1, chains: { count: 4 } };
    expect(errorsOf(withTruss({ params: ring }))).toEqual([
      'trusses[0].params.chains.phase: expected a finite number, got undefined',
    ]);
  });

  it('normalizes a transform rotation and rejects a missing position', () => {
    const parsed = parseStageDesign(withTruss({ transform: { position: [0, 7, 2], rotation: [0, 0, 5, 0] } }));
    expect(parsed.ok && parsed.design.trusses[0]?.transform.rotation).toEqual([0, 0, 1, 0]);
    expect(errorsOf(withTruss({ transform: {} }))).toEqual([
      'trusses[0].transform.position: expected 3 numbers, got undefined',
    ]);
  });

  it('gives a fixture on a truss with a bad field no second error', () => {
    expect(errorsOf(withTruss({ name: 3 }))).toEqual(['trusses[0].name: expected a string, got 3']);
  });
});
