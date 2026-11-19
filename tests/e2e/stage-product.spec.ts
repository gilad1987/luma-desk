/**
 * Owns "a stage with a catalogue product saves and loads" through the real app: a saved theatre design with one Robe
 * Esprite boots, keeps its `product` and derives one fixture more; the show the app then saves itself still names the
 * product, and a second boot from that saved text keeps it. The parser branches (an unknown id, a base that differs, a
 * non-string) are owned by the unit tests in tests/unit/domain/stage/.
 */
import { expect, test, type JSHandle, type Page } from '@playwright/test';
import { STORAGE_KEYS, TIMER_POLLING, type DeskTestApi, type SavedShow } from '../shared';
import { bootApp, collectErrors } from '../shared/e2e';

/** The part of a stored stage fixture this spec reads; the other keys pass through as the desk saved them. */
interface StoredFixture {
  id: number;
  product?: string;
}

/** A show with a custom stage; only the fixture list is read, the rest of the stage is kept as is. */
interface ShowWithStage extends SavedShow {
  stage: { fixtures: StoredFixture[] };
}

/** The `product` of the last stored fixture and the derived fixture count, as the desk sees them now. */
async function readProductStage(desk: JSHandle<DeskTestApi>): Promise<[string | undefined, number]> {
  return desk.evaluate((d) => [
    (d.serialize() as Partial<ShowWithStage>).stage?.fixtures.at(-1)?.product,
    window.__desk.stage().count,
  ]);
}

/**
 * The show text the app itself saves. The init script of `bootApp` wrote the test's own text, so it is removed first;
 * a cue store then asks for the delayed save (a real 500 ms timer), so the text read back can only come from the app.
 */
async function appSavedShowText(page: Page, desk: JSHandle<DeskTestApi>): Promise<string> {
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEYS.show);
  await desk.evaluate((d) => {
    d.run(`Fixture ${window.__desk.fixtures[0]?.id ?? 0} At 100`);
    d.run('Store Exec 1');
  });
  const saved = await page.waitForFunction((key) => localStorage.getItem(key) ?? '', STORAGE_KEYS.show, TIMER_POLLING);
  return saved.jsonValue();
}

/** The cue count of executor 1: the app's save has one cue more than the test's own show, so it tells them apart. */
const cuesOf = (show: SavedShow): number => show.execs[0]?.cues.length ?? 0;

test('a theatre stage with a Robe Esprite keeps the product in the show the app saves and in a boot from it', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await page.evaluate(() => window.__desk.applyTemplate('theatre'));
  const theatreCount = await page.evaluate(() => window.__desk.stage().count);
  const show = (await desk.evaluate((d) => d.serialize())) as ShowWithStage;
  const esprite = {
    id: Math.max(...show.stage.fixtures.map((f) => f.id)) + 1,
    type: 'spot',
    role: 'front',
    trussId: null,
    position: [0, 6, 2],
    mount: 'hang',
    product: 'robe-esprite',
  };
  const withEsprite: ShowWithStage = { ...show, stage: { ...show.stage, fixtures: [...show.stage.fixtures, esprite] } };

  const loaded = await bootApp(page, { show: withEsprite });
  expect([errors, ...(await readProductStage(loaded))]).toEqual([[], 'robe-esprite', theatreCount + 1]);

  const savedText = await appSavedShowText(page, loaded);
  const saved = JSON.parse(savedText) as ShowWithStage;
  expect([saved.stage.fixtures.at(-1)?.product, saved.stage.fixtures.length, cuesOf(saved)]).toEqual([
    'robe-esprite',
    withEsprite.stage.fixtures.length,
    cuesOf(withEsprite) + 1,
  ]);

  // bootApp adds one more init script; the cue count shows the boot really read the app's saved text
  const reloaded = await bootApp(page, { show: savedText });
  const again = (await reloaded.evaluate((d) => d.serialize())) as ShowWithStage;
  expect([errors, ...(await readProductStage(reloaded)), cuesOf(again)]).toEqual([
    [],
    'robe-esprite',
    theatreCount + 1,
    cuesOf(saved),
  ]);
});
