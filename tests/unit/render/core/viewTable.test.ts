import { describe, expect, it } from 'vitest';
import { isViewName } from '../../../../src/render/camera/viewTable';

describe('isViewName', () => {
  it('accepts the camera views, including fohMa, which has no button', () => {
    expect(['foh', 'fohMa', 'front', 'stage', 'top'].map(isViewName)).toEqual([true, true, true, true, true]);
  });

  it('rejects an unknown name and an inherited key, so setView moves no camera for them', () => {
    expect(['nope', 'toString', '__proto__', ''].map(isViewName)).toEqual([false, false, false, false]);
  });
});
