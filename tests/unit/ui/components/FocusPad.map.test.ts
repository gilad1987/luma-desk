/** The focus pad map draws the current stage: the built-in map call for call, and only what another stage has. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../src/core';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { frameOf } from '../../../../src/domain/stage/StageFrame';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { BAND_PTS, RING, SCREEN, STAGE } from '../../../../src/domain/venue';
import type { EngineEvents } from '../../../../src/engine/events';
import { AimHeight } from '../../../../src/ui/components/AimHeight';
import { focusPad } from '../../../../src/ui/components/FocusPad';
import { padScale } from '../../../../src/ui/components/padScale';
import { asReal, FakeCanvas } from '../../../shared/dom';

/** One context call: its name, the fill style at that moment and its arguments. */
type Call = readonly [name: string, fill: string, args: readonly unknown[]];

/** A 500 x 280 pad whose 2D context records every call with the fill style it ran under. */
class RecordingCanvas extends FakeCanvas {
  width = 500;
  height = 280;
  readonly calls: Call[] = [];
  getContext(): object {
    let fill = '';
    const get = (_: object, key: string): unknown =>
      key === 'fillStyle' ? fill : (...args: unknown[]) => void this.calls.push([key, fill, args]);
    const set = (_: object, key: string, value: string): boolean => ((fill = key === 'fillStyle' ? value : fill), true);
    return new Proxy({}, { get, set });
  }
}

afterEach(() => vi.unstubAllGlobals());

/** The calls of the first draw of a pad on `design`. */
function drawOn(design: StageDesign): readonly Call[] {
  const canvas = new RecordingCanvas();
  const frame = frameOf(design);
  const deps = { selection: { ids: [] }, programmer: { set: vi.fn() }, rig: { get: () => undefined } };
  focusPad(asReal<HTMLCanvasElement>(canvas), {
    ...deps,
    bus: new EventBus<EngineEvents>(),
    aimHeight: new AimHeight(),
    frame: () => frame,
  });
  return canvas.calls;
}

const s = padScale({ width: 500, height: 280 });
const argsOf = (calls: readonly Call[], name: string, fill?: string): (readonly unknown[])[] =>
  calls.filter((c) => c[0] === name && (fill === undefined || c[1] === fill)).map((c) => c[2]);
/** The grey marks: their centres. */
const marksOf = (calls: readonly Call[]): unknown[][] => argsOf(calls, 'arc', '#555').map((a) => a.slice(0, 2));

describe('focus pad map', () => {
  it('draws the built-in deck, wall, ring and marks from the venue constants', () => {
    const calls = drawOn(BUILT_IN_DESIGN);
    const deck = [s.x(STAGE.x0), s.z(STAGE.z0), s.x(STAGE.x1) - s.x(STAGE.x0), s.z(STAGE.z1) - s.z(STAGE.z0)];
    expect(argsOf(calls, 'fillRect', '#16161a')).toEqual([deck]);
    const wall = [s.x(SCREEN.x0), s.z(SCREEN.z) - 2, s.x(SCREEN.x1) - s.x(SCREEN.x0), 3];
    expect(argsOf(calls, 'fillRect', '#1f2a44')).toEqual([wall]);
    expect(argsOf(calls, 'ellipse')).toEqual([[s.x(RING.x), s.z(RING.z), 90, 90, 0, 0, 7]]);
    const marks = marksOf(calls);
    expect(marks.slice(0, BAND_PTS.length)).toEqual(BAND_PTS.map(([x, z]) => [s.x(x), s.z(z)]));
    expect(marks).toHaveLength(BAND_PTS.length + 30);
  });

  it('draws only the theatre deck: no built-in wall, ring or band marks', () => {
    const theatre = createTemplate('theatre');
    const { deck, screen, ring, bandPoints } = frameOf(theatre);
    const calls = drawOn(theatre);
    const rect = [s.x(deck.x0), s.z(deck.z0), s.x(deck.x1) - s.x(deck.x0), s.z(deck.z1) - s.z(deck.z0)];
    expect(argsOf(calls, 'fillRect', '#16161a')).toEqual([rect]);
    expect(argsOf(calls, 'fillRect', '#1f2a44')).toHaveLength(screen ? 1 : 0);
    expect(argsOf(calls, 'ellipse')).toHaveLength(ring ? 1 : 0);
    expect(marksOf(calls).slice(0, bandPoints.length)).toEqual(bandPoints.map(([x, z]) => [s.x(x), s.z(z)]));
  });

  it('draws no band or seat marks on a stage with the band off', () => {
    const design = { ...BUILT_IN_DESIGN, scenery: { ...BUILT_IN_DESIGN.scenery, band: false } };
    expect(marksOf(drawOn(design))).toEqual([]);
  });
});
