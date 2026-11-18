/** The parts of a stage build are tracked even when the build throws, so the next rebuild takes them out. */
import { Mesh, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { StageParts } from '../../../../src/render/stage/StageParts';

describe('StageParts.capture', () => {
  it('records the children a throwing build added, so dispose removes them', () => {
    const scene = new Scene(),
      parts = new StageParts(),
      added = new Mesh();
    const build = (): void => {
      scene.add(added);
      throw new Error('builder failed');
    };
    expect(() => parts.capture(scene, build)).toThrow('builder failed');
    parts.dispose(new Set());
    expect(scene.children).toEqual([]);
    expect(added.parent).toBeNull();
  });
});
