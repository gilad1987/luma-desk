/**
 * The generated LED content takes the colour pair of the MVR first look: the app reads the pair the show chose for
 * the rig and hands it to the render as plain numbers, when the look is placed and when a stored stage is restored.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ledPaletteOf } from '../../../../src/app/mvr/ledLookPalette';
import { mvrShow } from '../../../../src/app/mvr/mvrShow';
import { Rig } from '../../../../src/domain/rig/Rig';
import { ledUniforms, setLedPalette } from '../../../../src/render/mvr/led/ledUniforms';
import { LOOK_PALETTES, paletteOf } from '../../../../src/show/mvrLook/lookPalette';
import type { StartingShow } from '../../../../src/show/startingShow/StartingShow';

afterEach(() => setLedPalette([]));

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const onWalls = (): number[][] =>
  ledUniforms.uLedPalette.value.map((colour) => colour.toArray().map((value) => Math.round(value * 1e4) / 1e4));
/** Two fixture counts whose first looks take different colour pairs. */
const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const first = counts[0] ?? 1;
const other = counts.find((count) => paletteOf(count) !== paletteOf(first)) ?? 0;

/** A starting show on a rig with `count` fixtures, as far as the show steps of an import read it. */
function showOn(count: () => number): StartingShow {
  const rig = (): Rig => ({ fixtures: Array.from({ length: count() }) }) as unknown as Rig;
  const show = {
    before: () => ({ rig: rig(), starting: true }),
    build: vi.fn(),
    keep: vi.fn(),
    placeFirstLook: () => ({ kind: 'placed', execIndex: 0 }),
  };
  return show as unknown as StartingShow;
}

describe('ledPaletteOf', () => {
  it('is the pair of the first look at the content level, and a paler tone between them', () => {
    expect(other).toBeGreaterThan(0);
    for (const count of [first, other]) {
      const { primary, accent } = paletteOf(count);
      const [a, b, between] = ledPaletteOf(count);
      expect(a?.map((value) => value / 0.55)).toEqual([primary.r / 100, primary.g / 100, primary.b / 100]);
      expect(b?.[2]).toBeCloseTo((accent.b / 100) * 0.55);
      expect(between?.[0]).toBeCloseTo((((a?.[0] ?? 0) + (b?.[0] ?? 0)) / 2) * 0.6 + 0.25);
    }
    expect(LOOK_PALETTES).toContain(paletteOf(first));
  });
});

describe('the first look of an import', () => {
  it('gives the walls the colours of the look of the rig now on stage, for a built and for a kept show', async () => {
    let count = first;
    const steps = mvrShow(
      showOn(() => count),
      vi.fn(),
    );
    const before = { rig: new Rig([]), starting: true };
    steps.afterImport(before);
    await tick();
    expect(onWalls()).toEqual(ledPaletteOf(first).map((colour) => colour.map((v) => Math.round(v * 1e4) / 1e4)));
    count = other;
    steps.afterImport({ ...before, starting: false });
    await tick();
    expect(onWalls()).toEqual(ledPaletteOf(other).map((colour) => colour.map((v) => Math.round(v * 1e4) / 1e4)));
    expect(onWalls()).not.toEqual(ledPaletteOf(first).map((colour) => colour.map((v) => Math.round(v * 1e4) / 1e4)));
  });
});
