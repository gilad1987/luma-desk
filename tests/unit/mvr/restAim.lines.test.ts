// @vitest-environment jsdom
/** The summary lines of the rest aim: their grammar for one fixture, and the line for a tilt past the desk range. */
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { customCommands, fileDataFixture, fileDataMvr } from '../../shared/index.ts';

const aimed = (pan: number, tilt: number): string => customCommands(`Body_Pan,f ${pan}`, `Yoke_Tilt,f ${tilt}`);

/** The stored rest aims and the file data lines of an import of fixtures with these children. */
async function imported(rig: readonly string[]) {
  const fixtures = rig.map((data, index) => fileDataFixture(`U-${index}`, data, { x: index }));
  const { design, summary } = await importMvr(fileDataMvr(fixtures), { name: 'Lines.mvr' });
  return { fixed: design.fixtures.map((fixture) => fixture.fixed), lines: summary.fileDataLines ?? [] };
}

describe('the summary lines of the rest aim', () => {
  it('speaks of one fixture in the singular', async () => {
    const taken = await imported([aimed(20, 40), '']);
    expect(taken.lines[0]?.message).toBe("1 fixture takes its rest aim from the file's CustomCommands.");
    const zero = await imported([aimed(0, 0), '']);
    expect(zero.lines[0]?.message).toContain("1 fixture carries the same pan and tilt in the file's CustomCommands");
    const many = await imported([aimed(20, 40), aimed(10, 40)]);
    expect(many.lines[0]?.message).toBe("2 fixtures take their rest aim from the file's CustomCommands.");
  });

  it('names in one line the fixtures whose tilt is outside the desk range, and stops them at the limit', async () => {
    const { fixed, lines } = await imported([aimed(10, 150), aimed(20, -170), aimed(20, 40), aimed(5, 135)]);
    expect(fixed.map((aim) => aim?.tilt)).toEqual([-135, 135, -40, -135]);
    expect(lines.map((line) => [line.kind, line.count])).toEqual([
      ['restAim', 4],
      ['tiltLimit', 2],
    ]);
    expect(lines[1]?.message).toBe(
      "2 fixtures state a tilt in the file's CustomCommands outside the desk range of -135 to 135 degrees; the desk " +
        'stops at its limit.',
    );
    const one = await imported([aimed(10, 150), aimed(20, 40)]);
    expect(one.lines[1]?.message).toContain('1 fixture states a tilt');
  });
});
