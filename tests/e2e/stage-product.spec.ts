/**
 * Owns "a stage with a catalogue product saves and loads" through the real app: a saved theatre design with one Robe
 * Esprite boots, keeps its `product` and derives one fixture more, also after a reload. The parser branches (an
 * unknown id, a base that differs, a non-string) are owned by the unit tests in tests/unit/domain/stage/.
 */
import { expect, test, type JSHandle } from '@playwright/test';
import type { DeskTestApi, SavedShow } from '../shared';
import { bootApp, collectErrors, waitForTestApi } from '../shared/e2e';

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

test('a theatre stage with a Robe Esprite keeps the product after a load and a reload', async ({ page }) => {
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

  await page.reload();
  const reloaded = await waitForTestApi(page);
  expect([errors, ...(await readProductStage(reloaded))]).toEqual([[], 'robe-esprite', theatreCount + 1]);
});
