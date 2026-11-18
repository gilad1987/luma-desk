// @vitest-environment jsdom
/**
 * Owns the body lines after the draw: a fixture the draw step could not draw as planned leaves its import line for a
 * line that says why, so the counts of all body lines add up to the fixture count; a failed body step says so and
 * frees its library. All products are invented.
 */
import { describe, expect, it, vi } from 'vitest';
import { GdtfBodyFlow } from '../../../../src/app/mvr/GdtfBodyFlow';
import { bodyNoteLines } from '../../../../src/app/mvr/bodyNoteLines';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { BodyLine } from '../../../../src/mvr/import/bodyWarnings';
import { GdtfBodyLibrary } from '../../../../src/render/fixtures/gdtf/index.ts';
import { span, spottoRig } from '../../render/fixtures/gdtf/spottoRig';

const JUNK = new Uint8Array(4096).map((_, i) => (i * 37) & 255);
const sum = (lines: readonly BodyLine[]): number => lines.reduce((total, line) => total + line.count, 0);
const flow = (setGdtf: () => void) =>
  new GdtfBodyFlow({ visuals: { setGdtf, visuals: [] }, design: () => BUILT_IN_DESIGN });

describe('body lines after the draw', () => {
  it('keeps the import lines when every body is drawn', async () => {
    const result = await spottoRig({ 'models/3ds/head.3ds': span(300, 400) }, 2);
    const lines = await flow(() => undefined).show(result);
    expect(lines).toEqual(result.summary.bodyLines);
  });

  it.each([
    ['model file cannot be read', { 'models/3ds/head.3ds': JUNK }, 0],
    ['too detailed', { 'models/3ds/head.3ds': span(300, 400, 20_500) }, 0],
    ['its budget', { 'models/3ds/head.3ds': span(300, 400) }, 10],
  ])('replaces the import line of a fixture whose model is not drawn: %s', async (why, head, budget) => {
    const result = await spottoRig(head, 3);
    const library = new GdtfBodyLibrary(undefined, budget || undefined);
    await library.load({ bodies: result.bodies, gdtfMeshes: result.gdtfMeshes });
    const lines = bodyNoteLines(result.bodies, library.notes);
    expect(sum(lines)).toBe(3);
    expect(lines.some((line) => line.message.includes(why))).toBe(true);
    expect(lines.filter((line) => line.message.includes(why)).map((line) => line.draw)).toEqual(['deskAtBox']);
  });

  it('says the bodies failed and frees the new library when the rebuild throws', async () => {
    const result = await spottoRig({ 'models/3ds/head.3ds': span(300, 400) }, 2);
    const freed = vi.spyOn(GdtfBodyLibrary.prototype, 'dispose');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bodies = flow(() => {
      throw new Error('rebuild failed');
    });
    const lines = (await bodies.show(result)) ?? [];
    expect(freed).toHaveBeenCalledTimes(1);
    bodies.clear();
    expect(freed).toHaveBeenCalledTimes(1);
    expect([sum(lines), lines.map((line) => line.draw)]).toEqual([2, ['desk']]);
    expect(lines[0]?.message).toBe(
      '2 fixtures of "Spotto": the GDTF bodies cannot be built; the desk model is shown at its own size.',
    );
  });
});
