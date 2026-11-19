import { describe, expect, it } from 'vitest';
import { smaaReady } from '../../../../src/render/post/smaaReady';

/** A lookup texture whose image decodes when `finish` is called. */
function lookup(fails = false) {
  let finish: () => void = () => {};
  const done = new Promise<void>((resolve, reject) => (finish = fails ? () => reject(new Error('bad')) : resolve));
  return { texture: { image: { decode: () => done }, needsUpdate: false }, finish };
}

describe('smaaReady', () => {
  it('resolves only when both lookup images are decoded, and marks both for upload', async () => {
    const area = lookup();
    const search = lookup();
    let ready = false;
    const waiting = smaaReady({ areaTexture: area.texture, searchTexture: search.texture }).then(() => (ready = true));
    area.finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(ready).toBe(false);
    search.finish();
    await waiting;
    expect(area.texture.needsUpdate).toBe(true);
    expect(search.texture.needsUpdate).toBe(true);
  });

  it('still resolves when an image cannot be decoded or is no image', async () => {
    const broken = lookup(true);
    broken.finish();
    const plain = { image: null, needsUpdate: false };
    await expect(smaaReady({ areaTexture: broken.texture, searchTexture: plain })).resolves.toBeUndefined();
    expect(plain.needsUpdate).toBe(false);
  });
});
