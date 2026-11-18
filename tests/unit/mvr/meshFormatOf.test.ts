/** meshFormatOf: the one rule the import's bounds and render's loaders share for what a mesh file is. */
import { describe, expect, it } from 'vitest';
import { meshFormatOf } from '../../../src/mvr/index.ts';

describe('meshFormatOf', () => {
  it.each([
    ['stage.glb', 'glb'],
    ['Stage.GLB', 'glb'],
    ['chair.3ds', '3ds'],
    ['CHAIR.3DS', '3ds'],
    ['chair', '3ds'],
    ['model.obj', undefined],
    ['scene.gltf', undefined],
  ] as const)('reads %s as %s', (file, format) => {
    expect(meshFormatOf(file)).toBe(format);
  });
});
