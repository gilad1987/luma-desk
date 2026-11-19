/**
 * An audience choice that cannot be applied reaches the app's error channel: the control swallowed the error before,
 * so a runtime fault in the audience code changed nothing on screen and said nothing.
 */
import { expect, it, vi } from 'vitest';
import { audienceControl, type AudienceModule } from '../../../../src/app/mvr/audienceControl';
import { classifyProxies } from '../../../../src/mvr/scene/proxyClassify';
import { seatRows } from '../../../shared/index';

const proxies = classifyProxies(seatRows(8, 3, 540, { symdef: 'S', layer: 'L' }), [0, -9000, 0]);
const broken: AudienceModule = {
  setAudience: () => {
    throw new Error('the audience could not be set');
  },
  audienceLayers: () => 1,
};

it('reports a choice that the audience code rejects', async () => {
  const report = vi.fn();
  const control = audienceControl(proxies, report, () => Promise.resolve(broken));
  expect(control?.seats([])).toBe(24);
  control?.onChange({ shown: true, occupancy: 1 });
  await vi.waitFor(() => expect(report).toHaveBeenCalledTimes(1));
  expect(report).toHaveBeenCalledWith(new Error('the audience could not be set'));
  expect(await control?.built).toBe(true);
});

it('reports a module that did not load, and says the audience is not built', async () => {
  const report = vi.fn();
  const control = audienceControl(proxies, report, () => Promise.reject(new Error('chunk failed')));
  control?.onChange({ shown: false, occupancy: 0.5 });
  await vi.waitFor(() => expect(report).toHaveBeenCalledWith(new Error('chunk failed')));
  expect(await control?.built).toBe(false);
});

it('keeps the last choice of its stage, and a new control starts without one', () => {
  const load = (): Promise<AudienceModule> => Promise.resolve({ setAudience: () => 0, audienceLayers: () => 1 });
  const control = audienceControl(proxies, vi.fn(), load);
  expect(control?.choice()).toBeUndefined();
  control?.onChange({ shown: false, occupancy: 0.5 });
  expect(control?.choice()).toEqual({ shown: false, occupancy: 0.5 });
  expect(audienceControl(proxies, vi.fn(), load)?.choice()).toBeUndefined();
});

it('gives no control and reports nothing for a file without seats', () => {
  const report = vi.fn();
  expect(audienceControl([], report)).toBeUndefined();
  expect(report).not.toHaveBeenCalled();
});
