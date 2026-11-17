// @vitest-environment jsdom
/**
 * Limits of `walkScene` against hostile scenes: deep `<ChildList>` nesting stops with one warning instead of a stack
 * overflow, the scene's placements are capped, and a malformed `<Matrix>` warns instead of silently becoming identity.
 */
import { describe, expect, it } from 'vitest';
import { identity } from '../../../src/mvr/math/Mat4.ts';
import { MeshLimit } from '../../../src/mvr/scene/MeshLimit.ts';
import type { MvrScene } from '../../../src/mvr/scene/MvrScene.ts';
import { walkScene } from '../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';
import { sceneXml } from '../../shared/index.ts';

const symbol = (symdef: string): string => `<Symbol uuid="i-${symdef}" symdef="${symdef}"/>`;
const object = (uuid: string, inner: string): string => `<SceneObject uuid="${uuid}">${inner}</SceneObject>`;

/** Walks one layer holding `children`, with `symdefs` in AUXData. */
const walk = (children: string, symdefs = ''): MvrScene =>
  walkScene(parseXml(sceneXml(`<Layer uuid="L" name="L"><ChildList>${children}</ChildList></Layer>`, symdefs)));

/** A fixture inside `depth` nested groups. */
const nested = (depth: number): string =>
  '<GroupObject uuid="g"><ChildList>'.repeat(depth) +
  '<Fixture uuid="deep"/>' +
  '</ChildList></GroupObject>'.repeat(depth);

const codes = (scene: MvrScene): string[] => scene.warnings.map((w) => w.code);

describe('walkScene limits', () => {
  // 1000 levels, not the 3000 that overflowed the stack, because jsdom's parser alone needs 10 s for 3000; the walk
  // stops at the same level either way.
  it('stops 1000 nested groups with one scene-depth warning instead of recursing through them all', () => {
    const scene = walk(nested(1000));
    expect([scene.fixtures.length, codes(scene)]).toEqual([0, ['scene-depth']]);
  });

  it('walks 200 nested groups in full', () => {
    const scene = walk(nested(200));
    expect([scene.fixtures.map((f) => f.uuid), codes(scene)]).toEqual([['deep'], []]);
  });

  // The Symdef's 100 000 meshes, the first object's copy of them and 50 000 of the second copy spend the one budget;
  // a placement is not counted again, so both copies place what they built.
  it('stops the placements of several large objects when the mesh budget is spent, with one warning', () => {
    const big = `<Symdef uuid="B"><ChildList>${'<Geometry3D fileName="m.glb"/>'.repeat(100_000)}</ChildList></Symdef>`;
    const objects = ['O1', 'O2', 'O3'].map((uuid) => object(uuid, `<Geometries>${symbol('B')}</Geometries>`));
    const scene = walk(objects.join(''), big);
    expect([scene.placements.length, codes(scene)]).toEqual([MeshLimit.MAX - 100_000, ['too-many-meshes']]);
  });

  it('warns bad-matrix with the owner uuid for a malformed Matrix and uses identity', () => {
    const geometry = '<Geometries><Geometry3D fileName="m.glb"/></Geometries>';
    const scene = walk(object('O', `<Matrix>{1,0,0}{0,1,0}{0,0,1}{abc}</Matrix>${geometry}`));
    expect(scene.warnings.map((w) => [w.code, w.ref])).toEqual([['bad-matrix', 'O']]);
    expect([...(scene.placements[0]?.matrix ?? [])]).toEqual([...identity()]);
  });

  it('warns bad-matrix once per import with the count and the first owner', () => {
    const bad = (uuid: string): string => object(uuid, '<Matrix>{1,0,0}{abc}</Matrix>');
    const scene = walk(bad('O1') + bad('O2') + bad('O3'));
    expect(scene.warnings.map((w) => [w.code, w.ref, /\b3\b/.test(w.message)])).toEqual([['bad-matrix', 'O1', true]]);
  });
});
