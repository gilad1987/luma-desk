import { expect, it } from 'vitest';
import { foldWarnings } from '../../../src/mvr/foldWarnings.ts';
import type { MvrWarning } from '../../../src/mvr/MvrWarning.ts';

it('keeps the text of a folded line that has no ref, and the refs of the others', () => {
  const lines: MvrWarning[] = [
    { code: 'missing-mesh', message: 'a.glb is missing', ref: 'a.glb' },
    { code: 'missing-mesh', message: 'a mesh of the truss is missing' },
  ];
  const [line] = foldWarnings(lines);
  expect(line?.message).toBe('2 mesh files are not in the archive: "a.glb".');
  expect(line?.refs).toEqual(['a.glb', 'a mesh of the truss is missing']);
});

it('folds many lines of one code into one line, in order', () => {
  const lines: MvrWarning[] = Array.from({ length: 5000 }, (_, i) => ({
    code: 'missing-mesh',
    message: `m${i}`,
    ref: `m${i}.glb`,
  }));
  const folded = foldWarnings([{ code: 'bad-gdtf', message: 'other' }, ...lines]);
  expect(folded.map((line) => line.code)).toEqual(['bad-gdtf', 'missing-mesh']);
  expect(folded[1]?.refs?.length).toBe(5000);
  expect(folded[1]?.refs?.[4999]).toBe('m4999.glb');
});
