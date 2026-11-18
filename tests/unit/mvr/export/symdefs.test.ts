// @vitest-environment jsdom
/**
 * Mesh sharing in the written scene: one `<Symdef>` per distinct body, every stage object places its body through a
 * `<Symbol>`, and the import's scene walk expands them to one placement per object on the shared file.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import { meshFileOf } from '../../../../src/mvr/export/MeshShape.ts';
import { meshShapes } from '../../../../src/mvr/export/meshShapes.ts';
import { objectSpecs } from '../../../../src/mvr/export/objectSpecs.ts';
import { writeScene } from '../../../../src/mvr/export/writeScene.ts';
import { walkScene } from '../../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';

const count = (xml: string, tag: string): number => xml.split(`<${tag} `).length - 1;

describe('Symdef sharing of stage meshes', () => {
  const design = createTemplate('festival');
  const { xml } = writeScene(design);

  it('writes one Symdef per distinct body and one Symbol per object', () => {
    expect(count(xml, 'Symdef')).toBe(meshShapes(design).size);
    expect(count(xml, 'Symbol')).toBe(objectSpecs(design).length);
    expect(count(xml, 'Geometry3D')).toBe(meshShapes(design).size);
  });

  it('expands to one placement per object on the shared files', () => {
    const scene = walkScene(parseXml(xml));
    const files = scene.placements.map((placement) => placement.file);
    expect(files).toHaveLength(objectSpecs(design).length);
    expect(new Set(files)).toEqual(new Set(meshShapes(design).keys()));
    expect(scene.warnings).toEqual([]);
  });

  it('names equal shapes alike and different shapes apart, with safe characters only', () => {
    const deck = { kind: 'deck', size: [10, 1, 8] } as const;
    expect(meshFileOf(deck)).toBe(meshFileOf({ kind: 'deck', size: [10, 1, 8] }));
    expect(meshFileOf(deck)).not.toBe(meshFileOf({ kind: 'deck', size: [10, 1.2, 8] }));
    expect(meshFileOf(deck)).toMatch(/^luma_deck_[a-z0-9]{12}\.glb$/);
  });
});
