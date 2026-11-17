// @vitest-environment jsdom
/**
 * The mesh budget is one running count for the whole import. A chain of Symdefs that each place the one below copies
 * a huge memoised list once per level; with a cap per list, a 17.8 KB file built 3.5 million meshes (~929 MiB).
 */
import { describe, expect, it } from 'vitest';
import type { MvrWarning } from '../../../../src/mvr/MvrWarning.ts';
import { MeshLimit } from '../../../../src/mvr/scene/MeshLimit.ts';
import { walkScene } from '../../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { sceneXml } from '../../../shared/index.ts';

const symbol = (n: number): string => `<Symbol uuid="i${n}" symdef="S${n}"/>`;
const symdef = (n: number, children: string): string =>
  `<Symdef uuid="S${n}"><ChildList>${children}</ChildList></Symdef>`;

/** The reviewer's probe: 64 meshes, 64 x 64, 64 x 64 x 64 (262 144), then 13 Symdefs that each hold the next. */
function chain(): string {
  const defs = [symdef(15, '<Geometry3D fileName="a.3ds"/>'.repeat(64)), symdef(14, symbol(15).repeat(64))];
  defs.push(symdef(13, symbol(14).repeat(64)));
  for (let n = 12; n >= 0; n--) defs.push(symdef(n, symbol(n + 1)));
  return defs.join('');
}

/** One layer holding one `SceneObject` with `count` plain `<Geometry3D>`s, walked into a scene. */
function plainMeshes(count: number): ReturnType<typeof walkScene> {
  const meshes = '<Geometry3D fileName="a.3ds"/>'.repeat(count);
  const object = `<SceneObject uuid="O"><Geometries>${meshes}</Geometries></SceneObject>`;
  return walkScene(parseXml(sceneXml(`<Layer uuid="L" name="L"><ChildList>${object}</ChildList></Layer>`)));
}

describe('MeshLimit budget', () => {
  it('counts each plain scene mesh once: 130 000 meshes give 130 000 placements and no warning', () => {
    const scene = plainMeshes(130_000);
    expect([scene.placements.length, scene.warnings]).toEqual([130_000, []]);
  }, 20_000);

  it('caps 250 001 plain scene meshes at the budget with one warning', () => {
    const scene = plainMeshes(MeshLimit.MAX + 1);
    const codes = scene.warnings.map((warning) => warning.code);
    expect([scene.placements.length, codes]).toEqual([MeshLimit.MAX, ['too-many-meshes']]);
  }, 20_000);

  it('counts every mesh against one budget and warns once', () => {
    const warnings: MvrWarning[] = [];
    const limit = new MeshLimit(warnings);
    const taken = Array.from({ length: MeshLimit.MAX + 3 }, () => limit.take()).filter(Boolean).length;
    expect([taken, warnings.map((warning) => warning.code)]).toEqual([MeshLimit.MAX, ['too-many-meshes']]);
  });

  it('stops a Symdef chain that copies a capped list on every level', () => {
    const object = `<SceneObject uuid="O"><Geometries>${symbol(0)}</Geometries></SceneObject>`;
    const scene = walkScene(
      parseXml(sceneXml(`<Layer uuid="L" name="L"><ChildList>${object}</ChildList></Layer>`, chain())),
    );
    expect(scene.placements.length).toBeLessThan(MeshLimit.MAX);
    expect(scene.warnings.map((warning) => warning.code)).toEqual(['too-many-meshes']);
  }, 20_000);
});
