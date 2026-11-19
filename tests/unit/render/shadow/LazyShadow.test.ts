import { Group, type Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { LazyShadow } from '../../../../src/render/shadow/LazyShadow';
import { SHADOW_DEFAULTS } from '../../../../src/render/shadow/shadowConfig';

describe('LazyShadow', () => {
  const setupLazy = () => {
    const parts = { dispose: vi.fn() };
    const create = vi.fn<(root: Object3D) => typeof parts>(() => parts);
    return { lazy: new LazyShadow(create), create, parts };
  };

  it('creates nothing for a built-in stage, which has no scenery root, and nothing while it is off', () => {
    const { lazy, create } = setupLazy();
    expect(lazy.current).toBeUndefined();
    lazy.enable(SHADOW_DEFAULTS);
    expect(lazy.current).toBeUndefined();
    lazy.enable(undefined);
    lazy.setScenery(new Group());
    expect(lazy.current).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });

  it('creates the parts once per stage and frees them when the stage changes or the shadows go off', () => {
    const { lazy, create, parts } = setupLazy();
    const root = new Group();
    lazy.enable(SHADOW_DEFAULTS);
    lazy.setScenery(root);
    expect(lazy.current).toBe(parts);
    expect(lazy.current).toBe(parts);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(root, SHADOW_DEFAULTS);
    lazy.setScenery(null);
    expect(parts.dispose).toHaveBeenCalledTimes(1);
    expect(lazy.current).toBeUndefined();
    lazy.setScenery(root);
    expect(lazy.current).toBe(parts);
    lazy.enable(undefined);
    expect(parts.dispose).toHaveBeenCalledTimes(2);
  });
});
