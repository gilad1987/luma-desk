/**
 * The show and the readers of stage-product.spec.ts: a theatre show with one product of each body family appended
 * (a hung Esprite mover, a TetraX tilt bar hung on Pipe 1, a floor onePATT yoked can), and the reads of what the desk
 * keeps of them.
 */
import type { JSHandle, Page } from '@playwright/test';
import { STORAGE_KEYS, TIMER_POLLING, type DeskTestApi, type SavedShow } from '../shared';

/** The part of a stored stage fixture the spec reads; the other keys pass through as the desk saved them. */
interface StoredFixture {
  id: number;
  product?: string;
}

/** A show with a custom stage; only the fixture list is read, the rest of the stage is kept as is. */
export interface ShowWithStage extends SavedShow {
  stage: { fixtures: StoredFixture[] };
}

/** The appended products, in the order they are appended. */
export const PRODUCT_IDS = ['robe-esprite', 'robe-tetrax', 'robe-onepatt'];

/** The show with the three products appended after its own fixtures, with the next free ids. */
export function withProducts(show: ShowWithStage): ShowWithStage {
  const next = Math.max(...show.stage.fixtures.map((f) => f.id)) + 1;
  const added = [
    { type: 'spot', role: 'front', trussId: null, position: [0, 6, 2], mount: 'hang', product: 'robe-esprite' },
    { type: 'wash', role: 'mid', trussId: 'pipe-1', position: [1, 6.4, -1.5], mount: 'hang', product: 'robe-tetrax' },
    { type: 'par', role: 'front', trussId: null, position: [-1, 1.2, -6], mount: 'floor', product: 'robe-onepatt' },
  ].map((fixture, index) => ({ ...fixture, id: next + index }));
  return { ...show, stage: { ...show.stage, fixtures: [...show.stage.fixtures, ...added] } };
}

/** The `product` of each stored fixture appended by `withProducts`. */
export const productsOf = (show: Partial<ShowWithStage>): (string | undefined)[] =>
  (show.stage?.fixtures ?? []).slice(-PRODUCT_IDS.length).map((f) => f.product);

/** The products of the appended stored fixtures and the derived fixture count, as the desk sees them now. */
export async function readProductStage(desk: JSHandle<DeskTestApi>): Promise<[(string | undefined)[], number]> {
  const [show, count] = await desk.evaluate(
    (d) => [d.serialize() as Partial<ShowWithStage>, window.__desk.stage().count] as const,
  );
  return [productsOf(show), count];
}

/**
 * The show text the app itself saves. The init script of `bootApp` wrote the test's own text, so it is removed first;
 * a cue store then asks for the delayed save (a real 500 ms timer), so the text read back can only come from the app.
 */
export async function appSavedShowText(page: Page, desk: JSHandle<DeskTestApi>): Promise<string> {
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEYS.show);
  await desk.evaluate((d) => {
    d.run(`Fixture ${window.__desk.fixtures[0]?.id ?? 0} At 100`);
    d.run('Store Exec 1');
  });
  const saved = await page.waitForFunction((key) => localStorage.getItem(key) ?? '', STORAGE_KEYS.show, TIMER_POLLING);
  return saved.jsonValue();
}

/** The cue count of executor 1: the app's save has one cue more than the test's own show, so it tells them apart. */
export const cuesOf = (show: SavedShow): number => show.execs[0]?.cues.length ?? 0;
