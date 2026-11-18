/**
 * materialClass: the MVR tag decides first, then file PBR values a writer chose, then English or Hebrew words in the
 * object name, then in the layer name, then the neutral default. Names here are invented.
 */
import { MeshPhongMaterial, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { hasFileLook, materialClass, type PlacementEvidence } from '../../../../src/render/mvr/materialClass.ts';

const plain = new MeshStandardMaterial();
const place = (kind: string, name = '', layerName = ''): PlacementEvidence => ({ kind, name, layerName });

describe('materialClass', () => {
  it('reads the MVR tag first: truss and support are truss, a speaker element is a speaker', () => {
    const chosen = new MeshStandardMaterial({ roughness: 0.3, metalness: 0.2 });
    expect(materialClass(place('Truss', 'Curtain'), chosen)).toBe('truss');
    expect(materialClass(place('Support'), plain)).toBe('truss');
    expect(materialClass(place('SpeakerObject', 'Floor'), plain)).toBe('speaker');
  });

  it('keeps file values a writer chose, but not loader or exporter defaults', () => {
    expect(
      materialClass(place('SceneObject', 'Drape'), new MeshStandardMaterial({ roughness: 0.4, metalness: 0 })),
    ).toBe('file');
    expect(hasFileLook(new MeshStandardMaterial({ roughness: 1, metalness: 1 }))).toBe(false);
    expect(hasFileLook(new MeshStandardMaterial({ roughness: 0.5, metalness: 1 }))).toBe(false);
    expect(hasFileLook(plain)).toBe(false);
    expect(hasFileLook(new MeshPhongMaterial({ shininess: 80 }))).toBe(false);
  });

  it('reads English words in the object name', () => {
    const cases: [string, string][] = [
      ['Box Trusses 3m', 'truss'],
      ['Layher block A', 'scaffold'],
      ['Delay tower L', 'scaffold'],
      ['Main stage', 'deck'],
      ['Riser 2x1', 'deck'],
      ['Stairs SR', 'deck'],
      ['Back drape', 'cloth'],
      ['Soft goods US', 'cloth'],
      ['Side wall', 'wall'],
      ['Speaker cluster', 'speaker'],
      ['Band members', 'figure'],
      ['Mannequin 3', 'figure'],
      ['Roof ground support', 'truss'],
    ];
    for (const [name, expected] of cases) expect(materialClass(place('SceneObject', name), plain), name).toBe(expected);
  });

  it('reads Hebrew words, with a one-letter prefix', () => {
    expect(materialClass(place('SceneObject', 'הבמה הראשית'), plain)).toBe('deck');
    expect(materialClass(place('SceneObject', 'וילון אחורי'), plain)).toBe('cloth');
    expect(materialClass(place('SceneObject', 'פיגום ימין'), plain)).toBe('scaffold');
    expect(materialClass(place('SceneObject', 'טראס קדמי'), plain)).toBe('truss');
    expect(materialClass(place('SceneObject', 'נגנים', 'להקה'), plain)).toBe('figure');
  });

  it('prefers the narrow word, and the name over the layer', () => {
    expect(materialClass(place('SceneObject', 'Stage truss'), plain)).toBe('truss');
    expect(materialClass(place('SceneObject', 'Speaker wall'), plain)).toBe('speaker');
    expect(materialClass(place('SceneObject', 'Wall panel', 'Drapes'), plain)).toBe('wall');
    expect(materialClass(place('SceneObject', 'Object 12', 'Drapes'), plain)).toBe('cloth');
  });

  it('matches short words only as whole words', () => {
    expect(materialClass(place('SceneObject', 'Panel 4'), plain)).toBe('default');
    expect(materialClass(place('SceneObject', 'PA left'), plain)).toBe('speaker');
    expect(materialClass(place('SceneObject', 'עבודה'), plain)).toBe('default');
  });

  it('falls back to the default with no evidence', () => {
    expect(materialClass(place('SceneObject'), plain)).toBe('default');
    expect(materialClass(place('Symbol', '17', 'Layer 3'), plain)).toBe('default');
  });
});
