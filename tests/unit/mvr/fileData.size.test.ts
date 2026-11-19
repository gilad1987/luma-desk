// @vitest-environment jsdom
/**
 * The saved show repeats the file data on every fixture, so its size per fixture is bounded here: a rig of 500
 * fixtures that all carry a colour, two commands, a position and a class, as a Vectorworks export does.
 */
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { customCommands, fileDataFixture, fileDataMvr } from '../../shared/index.ts';

const COUNT = 500;
const P1 = '77bcde16-95a6-4725-9d04-16a0bd67cd1a';
const C1 = '4ab19462-a6e3-4c3b-b25a-d8099f78170c';
const AUX = `<Class uuid="${C1}" name="Lighting"/><Position uuid="${P1}" name="LX 1"/>`;
const DATA =
  `<Color>0.3127,0.3290,100</Color>${customCommands('Body_Pan,f 0.000000', 'Yoke_Tilt,f 0.000000')}` +
  `<Position>${P1}</Position><Classing>${C1}</Classing>`;

/** The bytes of the saved design of a rig whose fixtures all have `children`. */
async function savedSize(children: string): Promise<number> {
  const fixtures = Array.from({ length: COUNT }, (_, index) =>
    fileDataFixture(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, children, { x: index % 20 }),
  );
  const { design } = await importMvr(fileDataMvr(fixtures, AUX), { name: 'Size.mvr' });
  return JSON.stringify(design).length;
}

describe('the size of the stored file data', () => {
  it('adds a bounded number of bytes per fixture, and the colour once per design', async () => {
    const [before, after] = await Promise.all([savedSize(''), savedSize(DATA)]);
    // one index per node: `"color":0,"commands":0,"position":0,"classing":0` is 48 bytes; the tables are stored once
    // measured: 130410 bytes without the nodes, 155184 with them (inline values and uuids took 214621)
    expect((after - before) / COUNT).toBeLessThan(55);
  });
});
