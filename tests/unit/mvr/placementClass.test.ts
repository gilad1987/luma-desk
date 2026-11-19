// @vitest-environment jsdom
/**
 * A scene object's `<Classing>` names a `<Class>` of `<AUXData>` (MVR 1.6: "The Class the object belongs to."). The
 * scene walk puts the name of that class on every mesh placement of the object, so render can read it as evidence.
 */
import { describe, expect, it } from 'vitest';
import { walkScene } from '../../../src/mvr/scene/walkScene.ts';
import { sceneXml } from '../../shared/index.ts';

const C1 = '4ab19462-a6e3-4c3b-b25a-d8099f78170c';
const MESH = '<Geometries><Geometry3D fileName="a.3ds"/></Geometries>';

const object = (uuid: string, children: string): string =>
  `<SceneObject uuid="${uuid}" name="Object ${uuid}">${children}${MESH}</SceneObject>`;

function placementsOf(objects: readonly string[], aux: string) {
  const layers = `<Layer uuid="L1" name="Layer 1"><ChildList>${objects.join('')}</ChildList></Layer>`;
  return walkScene(new DOMParser().parseFromString(sceneXml(layers, aux), 'application/xml')).placements;
}

describe('the class name of a mesh placement', () => {
  it('is the name of the class the object refers to, whatever the spelling of the uuid', () => {
    const objects = [
      object('O1', `<Classing>${C1}</Classing>`),
      object('O2', `<Classing>${C1.toUpperCase()}</Classing>`),
      object('O3', '<Classing>00000000-0000-4000-8000-000000000009</Classing>'),
      object('O4', ''),
    ];
    const placements = placementsOf(objects, `<Class uuid="${C1}" name="Truss"/>`);
    expect(placements.map((placement) => [placement.uuid, placement.className])).toEqual([
      ['O1', 'Truss'],
      ['O2', 'Truss'],
      ['O3', undefined],
      ['O4', undefined],
    ]);
    expect(placements.map((placement) => 'className' in placement)).toEqual([true, true, false, false]);
  });

  it('is absent for a class without a name and in a file without classes', () => {
    const unnamed = placementsOf([object('O1', `<Classing>${C1}</Classing>`)], `<Class uuid="${C1}" name=""/>`);
    expect('className' in (unnamed[0] ?? {})).toBe(false);
    expect(placementsOf([object('O1', `<Classing>${C1}</Classing>`)], '')[0]?.className).toBeUndefined();
  });
});
