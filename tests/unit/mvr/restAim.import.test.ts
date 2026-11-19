// @vitest-environment jsdom
/**
 * The pan and tilt of a fixture's `<CustomCommands>` are the designer's focus: the import makes them the rest pose of
 * a moving fixture (`fixed`), unless every fixture carries the same values, which is no focus. Commands the desk
 * does not use are counted, and all of them stay in the design. All names are invented.
 */
import { describe, expect, it } from 'vitest';
import { fileCommandsOf } from '../../../src/domain/stage/mvrFileData.ts';
import { parseStageDesign } from '../../../src/domain/stage/parse/parseStageDesign.ts';
import { importMvr } from '../../../src/mvr/index.ts';
import { customCommands, fileDataFixture, fileDataMvr } from '../../shared/index.ts';

const aimed = (pan: number, tilt: number, ...more: string[]): string =>
  customCommands(`Body_Pan,f ${pan}`, `Yoke_Tilt,f ${tilt}`, ...more);

async function imported(children: readonly (readonly [string, string?])[]) {
  const fixtures = children.map(([data, spec], index) => fileDataFixture(`U-${index}`, data, { x: index }, spec));
  const { design, summary } = await importMvr(fileDataMvr(fixtures), { name: 'Aim.mvr' });
  const uuidOf = (id: number): string => design.mvr?.fixtures[String(id)]?.uuid ?? '';
  const poses = Object.fromEntries(design.fixtures.map((fixture) => [uuidOf(fixture.id), fixture.fixed]));
  return { design, poses, lines: summary.fileDataLines ?? [] };
}

describe('the rest aim of an imported rig', () => {
  it('takes the pan and the tilt of the file, as desk values, for moving fixtures only', async () => {
    const rig = [[aimed(45, -30, 'Body_Zoom,f 20')], [aimed(0, 0)], [''], [aimed(10, 20), 'Ghost@Blinder']] as const;
    const { design, poses, lines } = await imported(rig);
    expect(design.fixtures.map((fixture) => fixture.type)).toEqual(['wash', 'wash', 'wash', 'blinder']);
    expect(poses).toEqual({
      'U-0': { pan: 45, tilt: 30 },
      'U-1': { pan: 0, tilt: 0 },
      'U-2': undefined,
      'U-3': undefined,
    });
    expect(lines.map((line) => [line.kind, line.count])).toEqual([
      ['restAim', 2],
      ['unmappedCommands', 2],
    ]);
    expect(lines[0]?.message).toBe("2 fixtures take their rest aim from the file's CustomCommands.");
    expect(lines[1]?.message).toContain(
      '3 CustomCommands on 2 fixtures are not used by the desk, for example "Body_Zoom,f 20"',
    );
  });

  it('keeps every command and loads again as a saved show', async () => {
    const { design } = await imported([[aimed(45, -30, 'Body_Zoom,f 20')], [aimed(0, 0)]]);
    const infos = Object.values(design.mvr?.fixtures ?? {});
    const first = design.mvr && infos[0] ? fileCommandsOf(design.mvr, infos[0]) : [];
    expect(first).toEqual(['Body_Pan,f 45', 'Yoke_Tilt,f -30', 'Body_Zoom,f 20']);
    const saved: unknown = JSON.parse(JSON.stringify(design));
    const parsed = parseStageDesign(saved);
    expect(parsed.ok ? parsed.design.fixtures.map((fixture) => fixture.fixed) : []).toEqual([
      { pan: 45, tilt: 30 },
      { pan: 0, tilt: 0 },
    ]);
  });

  it('takes no pose when every fixture carries the same pan and tilt', async () => {
    const zero = await imported([[aimed(0, 0)], [aimed(0, 0)], [aimed(0, 0)]]);
    expect(Object.values(zero.poses)).toEqual([undefined, undefined, undefined]);
    expect(zero.lines.map((line) => [line.kind, line.count])).toEqual([['sameAim', 3]]);
    expect(zero.lines[0]?.message).toContain('3 fixtures carry the same pan and tilt');
    const one = await imported([[aimed(0, 0)], ['']]);
    expect(one.poses['U-0']).toBeUndefined();
    const single = await imported([[aimed(20, 40)], ['']]);
    expect(single.poses['U-0']).toEqual({ pan: 20, tilt: -40 });
  });

  it('names in one line the fixtures whose pan or tilt no head can adopt, and gives them no pose', async () => {
    const { lines, poses } = await imported([[aimed(1e300, 10)], [aimed(20, -3.6e9)], [aimed(20, 40)]]);
    expect(poses).toEqual({ 'U-0': undefined, 'U-1': undefined, 'U-2': { pan: 20, tilt: -40 } });
    expect(lines.map((line) => [line.kind, line.count])).toEqual([
      ['restAim', 1],
      ['aimLimit', 2],
      ['unmappedCommands', 2],
    ]);
    expect(lines[1]?.message).toContain("2 fixtures state a pan or tilt in the file's CustomCommands that no fixture");
  });

  it('does not mirror a physical command of a fixture with DMXInvertPan and DMXInvertTilt, and keeps the flags', async () => {
    const inverted = `${aimed(45, -30)}<DMXInvertPan>true</DMXInvertPan><DMXInvertTilt>true</DMXInvertTilt>`;
    const { design, poses } = await imported([[inverted], [aimed(10, 20)]]);
    expect(poses['U-0']).toEqual({ pan: 45, tilt: 30 });
    expect(Object.values(design.mvr?.fixtures ?? {})[0]).toMatchObject({ dmxInvertPan: true, dmxInvertTilt: true });
  });

  it('adds no line for a rig without commands', async () => {
    const { lines, poses } = await imported([[''], ['<Function>Key</Function>']]);
    expect(lines).toEqual([]);
    expect(Object.values(poses)).toEqual([undefined, undefined]);
  });
});
