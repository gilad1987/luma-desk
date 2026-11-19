/**
 * Owns the order rules of the GDTF body flow: bodies that are ready go to the fixture visuals as one source, a later
 * load or a stage change wins over a load that still parses, and `clear` takes the source away only when one is set.
 */
import { describe, expect, it, vi } from 'vitest';
import { GdtfBodyFlow } from '../../../../src/app/mvr/GdtfBodyFlow';
import type { GdtfBodySource } from '../../../../src/render/fixtures/gdtf/index.ts';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';

const EMPTY = { bodies: new Map(), gdtfMeshes: new Map() };
const setup = () => {
  const setGdtf = vi.fn<(source: GdtfBodySource | undefined) => void>();
  return { setGdtf, flow: new GdtfBodyFlow({ visuals: { setGdtf, visuals: [] }, design: () => BUILT_IN_DESIGN }) };
};

describe('GDTF body flow', () => {
  it('hands the fixture visuals a body source when the bodies are ready, and takes it away on clear', async () => {
    const { flow, setGdtf } = setup();
    await flow.show(EMPTY);
    expect(setGdtf).toHaveBeenCalledTimes(1);
    expect(setGdtf.mock.calls[0]?.[0]).toBeDefined();
    flow.clear();
    expect(setGdtf).toHaveBeenLastCalledWith(undefined);
  });

  it('drops a load that a stage change overtakes', async () => {
    const { flow, setGdtf } = setup();
    const loading = flow.show(EMPTY);
    flow.clear();
    await loading;
    expect(setGdtf).not.toHaveBeenCalled();
  });

  it('keeps only the later of two loads that run together', async () => {
    const { flow, setGdtf } = setup();
    await Promise.all([flow.show(EMPTY), flow.show(EMPTY)]);
    expect(setGdtf).toHaveBeenCalledTimes(1);
  });

  it('takes the source back when the rebuild throws after the visuals took it: none draws from a freed library', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { flow, setGdtf } = setup();
    await flow.show(EMPTY);
    setGdtf.mockImplementationOnce(() => {
      throw new Error('the rebuild failed');
    });
    await expect(flow.show(EMPTY)).resolves.toEqual([]);
    expect(setGdtf).toHaveBeenCalledTimes(3);
    expect(setGdtf).toHaveBeenLastCalledWith(undefined);
    // the flow holds no library now, so a clear has no source to take away
    flow.clear();
    expect(setGdtf).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  it('does not reject when taking the source back throws too', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { flow, setGdtf } = setup();
    setGdtf.mockImplementation(() => {
      throw new Error('the rebuild failed');
    });
    await expect(flow.show(EMPTY)).resolves.toEqual([]);
    expect(setGdtf.mock.calls.map(([source]) => source === undefined)).toEqual([false, true]);
    warn.mockRestore();
  });
});
