import { expect, test } from '@playwright/test';
import { STORAGE_KEYS, TIMER_POLLING, gdtfMode, makeGdtf, makeMvr, sceneXml, type FixtureOutput } from '../shared';
import { bootApp, collectErrors, mvrFile, pickMvrFile, waitForTestApi } from '../shared/e2e';

const BEAM = '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>';
const MOVER_CHANNELS: [string, string][] = [
  ['Dimmer', 'Offset="1"'],
  ['Pan', 'Offset="2"'],
  ['Tilt', 'Offset="3"'],
];

/** One fixture on `spec` at `x` mm from the centre line, 6 m up, patched from `address`. */
const fixture = (id: number, spec: string, x: number): string =>
  `<Fixture uuid="U-${id}" name="Light ${id}"><Matrix>{1,0,0}{0,1,0}{0,0,1}{${x},0,6000}</Matrix>` +
  `<GDTFSpec>${spec}</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>${id}</FixtureID>` +
  `<Addresses><Address break="0">${id * 4}</Address></Addresses></Fixture>`;

/** Two moving heads and two pars, each pair mirrored about the centre line. */
const LOOK_MVR = mvrFile(
  'Look.mvr',
  makeMvr(
    sceneXml(
      `<Layer uuid="L1" name="Rig"><ChildList>${
        fixture(201, 'Acme@Mover', -4000) +
        fixture(202, 'Acme@Mover', 4000) +
        fixture(203, 'Acme@Par', -2000) +
        fixture(204, 'Acme@Par', 2000) +
        fixture(205, 'Acme@Par', -6000) +
        fixture(206, 'Acme@Par', 6000)
      }</ChildList></Layer>`,
    ),
    {
      'Acme@Mover.gdtf': makeGdtf({ geometries: BEAM, modes: gdtfMode('Std', MOVER_CHANNELS) }),
      'Acme@Par.gdtf': makeGdtf({ geometries: BEAM, modes: gdtfMode('Std', [['Dimmer', 'Offset="1"']]) }),
    },
  ),
);

test('an MVR import plays the first look on executor 1: key beams, mirrored pans, glow', async ({ page }) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  expect((await desk.evaluate((d) => d.state())).execs[0]?.name).toBe('Main Show');
  await pickMvrFile(page, desk, LOOK_MVR);
  const exec = (await desk.evaluate((d) => d.state())).execs[0];
  expect(exec).toMatchObject({ name: 'MVR First Look', on: true, cur: 0, level: 1 });
  expect(exec?.cues).toEqual([[1, 'MVR First Look', 2]]);
  const out = await desk.evaluate((d) => d.outputAt(1));
  const byId = (id: number): FixtureOutput => out.find((o) => o.id === id) ?? { id };
  // the movers are the key beams at full; the static pars are a low glow
  expect([201, 202, 203, 204, 205, 206].map((id) => byId(id)['dim'])).toEqual([100, 100, 15, 15, 15, 15]);
  const [left, right] = [byId(201), byId(202)];
  expect(left['pan']).not.toBe(0);
  expect(right['pan']).toBeCloseTo(-(left['pan'] ?? NaN), 3);
  expect(right['tilt']).toBeCloseTo(left['tilt'] ?? NaN, 3);
  // key movers (one place) magenta; fill pars by place from the centre out: 2 m magenta, 6 m blue, never white
  const colorOf = (id: number): string => ['r', 'g', 'b'].map((a) => byId(id)[a]).join(',');
  expect([201, 202, 203, 204, 205, 206].map(colorOf)).toEqual([
    ...['100,0,100', '100,0,100', '100,0,100', '100,0,100'],
    ...['0,12,100', '0,12,100'],
  ]);
  expect(errors).toEqual([]);
});

test('a reload keeps the first look and builds no second one', async ({ page }) => {
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, LOOK_MVR);
  // the show is saved 500 ms after a change on a real timer; the poll is synchronous on purpose
  const isSaved = (key: string): boolean => (localStorage.getItem(key) ?? '').includes('"name":"MVR First Look"');
  await page.waitForFunction(isSaved, STORAGE_KEYS.show, TIMER_POLLING);
  await page.reload();
  const again = await waitForTestApi(page);
  await again.evaluate((d) => d.mvrReady());
  const execs = (await again.evaluate((d) => d.state())).execs;
  expect(execs[0]?.cues).toEqual([[1, 'MVR First Look', 2]]);
  expect(execs.filter((e) => e.name === 'MVR First Look')).toHaveLength(1);
});
