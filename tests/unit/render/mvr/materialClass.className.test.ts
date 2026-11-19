/**
 * The name of an object's MVR class is evidence for its material class: after the element tag, the mesh's own
 * material and the words of the object's name, before the words of its layer's name. English and Hebrew class words.
 */
import { MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { mvrClassWords as he } from '../../../../src/i18n/he/mvrClassWords.ts';
import { materialClass } from '../../../../src/render/mvr/materialClass.ts';

const PLAIN = new MeshBasicMaterial();
const NUMBERED = { kind: 'SceneObject', name: 'Object 12', layerName: 'Layer 3' };

describe('materialClass with the name of the MVR class', () => {
  it.each([
    ['Truss', 'truss'],
    ['Rigging - Trusses', 'truss'],
    ['Audio Speaker', 'speaker'],
    ['Soft Goods', 'cloth'],
    [he.truss[0] ?? '', 'truss'],
    [he.speaker[0] ?? '', 'speaker'],
    [he.cloth[0] ?? '', 'cloth'],
  ])('reads the class "%s" as %s for an object whose own names say nothing', (className, expected) => {
    expect(materialClass({ ...NUMBERED, className }, PLAIN)).toBe(expected);
  });

  it('puts the element tag and the material of the file before the class', () => {
    expect(materialClass({ ...NUMBERED, kind: 'Truss', className: 'Audio Speaker' }, PLAIN)).toBe('truss');
    const pbr = new MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 });
    expect(materialClass({ ...NUMBERED, className: 'Truss' }, pbr)).toBe('file');
  });

  it('puts the words of the object name before the class: a class sorts by trade, and a truss in it is a truss', () => {
    const truss = { kind: 'SceneObject', name: 'Truss 3m', layerName: 'Main curtain' };
    expect(materialClass({ ...truss, className: 'LED' }, PLAIN)).toBe('truss');
    expect(materialClass({ ...truss, className: 'Audio Speaker' }, PLAIN)).toBe('truss');
    expect(materialClass({ ...truss, className: he.speaker[0] ?? '' }, PLAIN)).toBe('truss');
    expect(materialClass({ ...truss, name: he.truss[0] ?? '', className: he.cloth[0] ?? '' }, PLAIN)).toBe('truss');
  });

  it('puts the class before the words of the layer name', () => {
    const numbered = { ...NUMBERED, layerName: 'Main curtain' };
    expect(materialClass({ ...numbered, className: 'Truss' }, PLAIN)).toBe('truss');
    expect(materialClass({ ...numbered, className: he.speaker[0] ?? '' }, PLAIN)).toBe('speaker');
  });

  it('falls back to the names for a class whose words name no kind, and for no class', () => {
    const named = { kind: 'SceneObject', name: 'Main curtain', layerName: 'Layer 3' };
    expect(materialClass({ ...named, className: 'Lighting' }, PLAIN)).toBe('cloth');
    expect(materialClass(named, PLAIN)).toBe('cloth');
    expect(materialClass({ ...NUMBERED, className: 'Lighting' }, PLAIN)).toBe('default');
  });
});
