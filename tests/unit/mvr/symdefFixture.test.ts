// @vitest-environment jsdom
/**
 * MVR 1.6, Table 10: a Symdef's child list holds `Geometry3D` and `Symbol` nodes. A `<Fixture>` there is not read as
 * a fixture, and one warning for the whole file says how many there are.
 */
import { describe, expect, it } from 'vitest';
import { walkScene } from '../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';
import { fx, passUuid as u } from '../../shared/index.ts';

const symdef = (n: number, children: string): string =>
  `<Symdef uuid="E0000000-0000-4000-8000-00000000000${n}" name="Def ${n}"><ChildList>${children}</ChildList></Symdef>`;

/** A scene with these Symdefs in AUXData and fixture 9 in its one layer. */
function sceneOf(symdefs: string) {
  const layer = `<Layer uuid="B0000000-0000-4000-8000-000000000001" name="L"><ChildList>${fx(u(9), 9)}</ChildList></Layer>`;
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?><GeneralSceneDescription verMajor="1" verMinor="6"><Scene>' +
    `<AUXData>${symdefs}</AUXData><Layers>${layer}</Layers></Scene></GeneralSceneDescription>`;
  const scene = walkScene(parseXml(xml));
  const warnings = scene.warnings.filter((warning) => warning.code === 'symdef-fixture');
  return { uuids: scene.fixtures.map((fixture) => fixture.uuid), warnings };
}

describe('a Fixture inside a Symdef', () => {
  it('is not imported, and the file gets one warning with the count', () => {
    const mesh = '<Geometry3D fileName="a.3ds"/>';
    const { uuids, warnings } = sceneOf(symdef(1, mesh + fx(u(1), 1) + fx(u(2), 2)) + symdef(2, fx(u(3), 3)));
    expect(uuids).toEqual([u(9)]);
    expect(warnings).toEqual([
      {
        code: 'symdef-fixture',
        message:
          '3 Fixtures are inside a Symdef, where MVR allows only Geometry3D and Symbol; the desk does not import them.',
      },
    ]);
    expect(sceneOf(symdef(1, fx(u(1), 1))).warnings[0]?.message).toContain('1 Fixture is inside a Symdef');
  });

  it('adds no warning for a Symdef that holds only what the spec lists', () => {
    expect(sceneOf(symdef(1, '<Geometry3D fileName="a.3ds"/>')).warnings).toEqual([]);
    expect(sceneOf('').warnings).toEqual([]);
  });
});
