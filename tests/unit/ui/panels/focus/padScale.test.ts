import { describe, expect, it } from 'vitest';
import { padScale } from '../../../../../src/ui/panels/focus/padScale';

const W = 300,
  H = 118;

describe('padScale (the focus pad mx/mz/ix/iz)', () => {
  const s = padScale({ width: W, height: H });

  it('maps venue metres exactly as the original formulas', () => {
    for (const m of [-25, -23, -0.3, 0, 0.6, 17.5, 25]) expect(s.x(m)).toBe(((m + 25) / 50) * W);
    for (const m of [-22, -21, -20.2, -9, 0.6, 6]) expect(s.z(m)).toBe(((m + 22) / 28) * H);
  });

  it('inverts pixels exactly as the original formulas', () => {
    for (const p of [0, 1, 37.5, 150, 299]) expect(s.invX(p)).toBe((p / W) * 50 - 25);
    for (const p of [0, 1, 59, 117]) expect(s.invZ(p)).toBe((p / H) * 28 - 22);
  });
});
