/**
 * Owns "a stage with catalogue products saves and loads" through the real app: a saved theatre design with one
 * product of each body family (a Robe Esprite, a TetraX hung on a truss, a onePATT on the floor) boots, keeps each
 * `product` and derives three fixtures more; the show the app then saves itself still names the products, and a second
 * boot from that saved text keeps them. The parser branches (an unknown id, a base that differs, a non-string) are
 * owned by the unit tests in tests/unit/domain/stage/.
 */
import { expect, test } from '@playwright/test';
import { bootApp, collectErrors } from '../shared/e2e';
import {
  PRODUCT_IDS,
  appSavedShowText,
  cuesOf,
  productsOf,
  readProductStage,
  withProducts,
  type ShowWithStage,
} from './stageProductShow';

test('a theatre stage with an Esprite, a TetraX and a onePATT keeps the products in the app save and a boot from it', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const desk = await bootApp(page);
  await page.evaluate(() => window.__desk.applyTemplate('theatre'));
  const theatreCount = await page.evaluate(() => window.__desk.stage().count);
  const show = withProducts((await desk.evaluate((d) => d.serialize())) as ShowWithStage);

  const loaded = await bootApp(page, { show });
  expect([errors, ...(await readProductStage(loaded))]).toEqual([[], PRODUCT_IDS, theatreCount + PRODUCT_IDS.length]);

  const savedText = await appSavedShowText(page, loaded);
  const saved = JSON.parse(savedText) as ShowWithStage;
  expect([productsOf(saved), saved.stage.fixtures.length, cuesOf(saved)]).toEqual([
    PRODUCT_IDS,
    show.stage.fixtures.length,
    cuesOf(show) + 1,
  ]);

  // bootApp adds one more init script; the cue count shows the boot really read the app's saved text
  const reloaded = await bootApp(page, { show: savedText });
  const again = (await reloaded.evaluate((d) => d.serialize())) as ShowWithStage;
  expect([errors, ...(await readProductStage(reloaded)), cuesOf(again)]).toEqual([
    [],
    PRODUCT_IDS,
    theatreCount + PRODUCT_IDS.length,
    cuesOf(saved),
  ]);
});
