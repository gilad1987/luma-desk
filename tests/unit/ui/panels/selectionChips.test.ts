import { describe, expect, it } from 'vitest';
import { programmerChip, selectionChip } from '../../../../src/ui/panels/selection/selectionChips';

describe('selection and programmer chips (same strings as the original fast tick)', () => {
  it('lists up to five ids, else first…last', () => {
    expect(selectionChip([])).toBe('Selection: <b>0</b>');
    expect(selectionChip([3, 1])).toBe('Selection: <b>2</b> <span style="color:var(--mut)">3 1</span>');
    expect(selectionChip([1, 2, 3, 4, 5, 6])).toBe('Selection: <b>6</b> <span style="color:var(--mut)">1…6</span>');
  });

  it('counts fixtures and phasers', () => {
    expect(programmerChip(0, 0)).toBe('Programmer: empty');
    expect(programmerChip(0, 2)).toBe('Programmer: <b style="color:var(--prog)">0 fix · 2 fx</b>');
    expect(programmerChip(4, 0)).toBe('Programmer: <b style="color:var(--prog)">4 fix</b>');
  });
});
