import { Color } from 'three';
import { LED_DEFAULT_PERCENT, ledRadiance } from './ledLevel';

/**
 * The palette of the generated content (linear RGB): the blue and magenta of the MVR first look, which is the show a
 * new stage starts with, and a pale violet accent between them. The file gives no content, so the colours are the
 * desk's; `setLedPalette` is the one call for a caller that knows the colours of the show now on stage.
 */
const PALETTE: readonly (readonly [number, number, number])[] = [
  [0.03, 0.1, 0.55],
  [0.5, 0.05, 0.4],
  [0.42, 0.36, 0.7],
];

/** The generated content looks on offer, in the order of the `uLedLook` uniform. */
export const LED_LOOKS = ['fields', 'bars', 'bokeh'] as const;
export type LedLook = (typeof LED_LOOKS)[number];

/**
 * The uniforms every LED wall material shares, so one write moves all walls of the stage. Pixel pitch is 3.9 mm, the
 * common indoor tile; the file states none.
 */
export const ledUniforms = {
  uLedLevel: { value: ledRadiance(LED_DEFAULT_PERCENT) },
  uLedTime: { value: 0 },
  uLedLook: { value: 0 },
  uLedPitch: { value: 0.0039 },
  uLedPalette: { value: PALETTE.map(([r, g, b]) => new Color(r, g, b)) },
};

let percent = LED_DEFAULT_PERCENT;

/** Sets the level of every LED wall, 0 to 100 per cent; 0 leaves the black mask. It is view state: never exported. */
export function setLedWallPercent(next: number): void {
  percent = Math.min(100, Math.max(0, next));
  ledUniforms.uLedLevel.value = ledRadiance(percent);
}

/**
 * Puts the walls back at the level and the look a new stage starts at, so an import shows its walls with no action
 * and does not inherit the look the user chose for the file before it.
 */
export function resetLedWalls(): void {
  setLedWallPercent(LED_DEFAULT_PERCENT);
  ledUniforms.uLedLook.value = 0;
}

export function ledWallPercent(): number {
  return percent;
}

/** Sets the generated content look of every wall; a name that is not on offer keeps the look. View state too. */
export function setLedLook(look: string): void {
  const index = LED_LOOKS.findIndex((name) => name === look);
  if (index >= 0) ledUniforms.uLedLook.value = index;
}

export function ledLook(): LedLook {
  return LED_LOOKS[ledUniforms.uLedLook.value] ?? 'fields';
}

/**
 * Moves the content to the time of this frame. `performance.now` is the timeline of the frame loop, and `?test`
 * freezes it and steps it by hand, so the content is the same picture at the same test time.
 */
export function syncLedTime(): void {
  ledUniforms.uLedTime.value = performance.now() / 1000;
}

/** Replaces the three content colours (linear RGB), for a caller that knows the show's dominant colours. */
export function setLedPalette(colours: readonly (readonly [number, number, number])[]): void {
  ledUniforms.uLedPalette.value.forEach((colour, index) => {
    const [r, g, b] = colours[index] ?? PALETTE[index] ?? [0, 0, 0];
    colour.setRGB(r, g, b);
  });
}
