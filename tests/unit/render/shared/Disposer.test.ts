import { describe, expect, it, vi } from 'vitest';
import { Disposer } from '../../../../src/render/shared';

const resource = () => ({ dispose: vi.fn() });

describe('Disposer', () => {
  it('disposes each tracked resource once, even when tracked twice, then starts empty', () => {
    const disposer = new Disposer();
    const a = resource(),
      b = resource();
    expect(disposer.track(a)).toBe(a);
    disposer.track(b);
    disposer.track(a);
    expect(disposer.size).toBe(2);
    disposer.dispose();
    expect(a.dispose).toHaveBeenCalledTimes(1);
    expect(b.dispose).toHaveBeenCalledTimes(1);
    expect(disposer.size).toBe(0);
    disposer.dispose();
    expect(a.dispose).toHaveBeenCalledTimes(1);
  });
});
