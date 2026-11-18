import { describe, expect, it } from 'vitest';
import { imageGateFailures, perceptualDiff, type RgbaImage } from '../../shared';
import { baseline, darkestRow, stage, translated, withLine, type Line } from './gateImages';
import { dimmedBrightest, exposed, hueTurned } from './imageEdits';

// The specification of the image gate: every case is built in code from a committed baseline (a bright FOH and a
// mostly dark wide view among them) or from the synthetic stage, and must pass or fail as stated. The numbers behind
// the limits are in tests/shared/image/limits.ts and docs/render-gates.md.
const IMAGES: readonly (readonly [string, () => RgbaImage])[] = [
  ['synthetic stage', () => stage()],
  ...['mvr-stage-foh', 'mvr-stage-wide', 'mvr-stage-front', 'mvr-stage-ma-foh'].map(
    (name) => [name, () => baseline(name)] as const,
  ),
];

const fails = (a: RgbaImage, b: RgbaImage, limit: RegExp): void =>
  expect(imageGateFailures(perceptualDiff(a, b))).toContainEqual(expect.stringMatching(limit));
const passes = (a: RgbaImage, b: RgbaImage): void => expect(imageGateFailures(perceptualDiff(a, b))).toEqual([]);

describe.each(IMAGES)('image gate on the %s', (_name, load) => {
  const img = load();
  const along = { x: 8, length: 240, vertical: false } as const;
  /** A line on the darkest band of the picture, where a truss tube shows against the house. */
  const line = (width: number, rgb: Line['rgb']): Line => ({ ...along, y: darkestRow(img, 8, 240), width, rgb });

  it('passes a 2 % exposure change both ways', () => {
    passes(img, exposed(img, 1.02));
    passes(img, exposed(img, 1 / 1.02));
  });

  it('fails a 5 % exposure change both ways on exposure', () => {
    fails(img, exposed(img, 1.05), /^\|exposure\|/);
    fails(img, exposed(img, 0.95), /^\|exposure\|/);
  });

  it('passes a 3° hue turn and fails a 10° one both ways on hue', () => {
    passes(img, hueTurned(img, 3));
    passes(img, hueTurned(img, -3));
    fails(img, hueTurned(img, 10), /^\|hue\|/);
    fails(img, hueTurned(img, -10), /^\|hue\|/);
  });

  it('fails when the brightest 1 % of the picture goes 30 % dimmer', () => {
    fails(img, dimmedBrightest(img, 0.01, 0.7), /^share/);
  });

  it('fails a lost grey truss line, 2 px or 1 px wide and 240 px long', () => {
    fails(withLine(img, line(2, [128, 128, 128])), img, /^share/);
    fails(withLine(img, line(1, [128, 128, 128])), img, /^share/);
  });

  it('passes a thin white line moved by one pixel, across or along', () => {
    const white = line(1, [255, 255, 255]);
    passes(withLine(img, white), withLine(img, { ...white, y: white.y + 1 }));
    const upright = { ...white, x: 101, y: 4, length: 80, vertical: true };
    passes(withLine(img, upright), withLine(img, { ...upright, x: 102 }));
  });

  it('passes the whole picture moved by one pixel', () => {
    passes(img, translated(img, 1, 0));
    passes(img, translated(img, 1, 1));
  });
});
