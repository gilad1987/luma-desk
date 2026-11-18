import { afterEach, describe, expect, it, vi } from 'vitest';
import { FpsClock } from '../../../../src/app/ui/FpsClock';
import { FakeDom } from '../../../shared/dom';

// legacy: main.ts at 3cbff92 lines 1503-1504 (counting) and 1531-1535 (slow tick)
describe('FpsClock', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows the average frame rate since the last slow tick, then the en-GB time of day', () => {
    const dom = new FakeDom();
    dom.add('fps');
    dom.add('clock');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 1, 21, 5, 9));
    const stats = new FpsClock();
    for (const dt of [0.02, 0.02, 0.02]) stats.frame(dt);
    stats.slow();
    expect([dom.get('fps').textContent, dom.get('clock').textContent]).toEqual(['50 fps', '21:05:09']);
    stats.frame(0.1);
    stats.slow();
    expect(dom.get('fps').textContent).toBe('10 fps');
  });
});
