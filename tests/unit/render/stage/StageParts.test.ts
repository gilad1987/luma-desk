/**
 * The parts of a stage build are tracked even when the build throws, so the next rebuild takes them out, and a
 * dispose frees the textures of their materials, shader uniforms included.
 */
import { BoxGeometry, Mesh, Scene, ShaderMaterial, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
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

describe('StageParts.dispose', () => {
  it('frees a texture that a shader material holds in a uniform', () => {
    const scene = new Scene(),
      parts = new StageParts(),
      map = new Texture();
    const freed = vi.spyOn(map, 'dispose');
    const material = new ShaderMaterial({ uniforms: { map: { value: map } } });
    parts.capture(scene, () => {
      scene.add(new Mesh(new BoxGeometry(), material));
    });
    parts.dispose(new Set());
    expect(freed).toHaveBeenCalledOnce();
  });
});
