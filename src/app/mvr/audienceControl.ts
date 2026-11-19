import type { MvrProxy } from '../../mvr';
import { figureCount } from '../../render/venue/audience/occupancy';
import type { AudienceChoice, AudienceControl } from '../../ui/panels/mvr/audienceRow';

/** What the control uses of the audience module (`addAudience.ts`). */
export type AudienceModule = Pick<
  typeof import('../../render/venue/audience/addAudience'),
  'setAudience' | 'audienceLayers'
>;

/**
 * The audience row of the import summary for a file with drawn seat proxies; undefined without them. The figure
 * count is the one the render uses (`figureCount` per seat layer, less the hidden layers), so the summary line
 * states what is on screen. `built` is false when the stage has no audience although it has seats: the audience
 * code did not load, and the row says so in place of a count. A choice that cannot be applied (the module did not
 * load, or `setAudience` threw) goes to `report`, the app's error channel: it was dropped without a word before.
 * The control keeps the last choice, so the row of a list opened again shows it; a new stage makes a new control.
 * `load` fetches the audience module; a test passes its own.
 */
export function audienceControl(
  proxies: readonly MvrProxy[] | undefined,
  report: (error: unknown) => void,
  load: () => Promise<AudienceModule> = () => import('../../render/venue/audience/addAudience'),
): AudienceControl | undefined {
  const perLayer = new Map<string, number>();
  for (const { kind, frame, pitch, layer } of proxies ?? []) {
    // The seats that `proxies.ts` draws: the ones with a frame and a pitch.
    if (kind === 'seat' && frame && pitch !== undefined) perLayer.set(layer, (perLayer.get(layer) ?? 0) + 1);
  }
  if (perLayer.size === 0) return undefined;
  const shown = (hidden: readonly string[]): number[] =>
    [...perLayer].flatMap(([layer, seats]) => (hidden.includes(layer) ? [] : [seats]));
  // The audience module came with the scenery that this summary reports on.
  const audience = load();
  let last: AudienceChoice | undefined;
  return {
    seats: (hidden) => shown(hidden).reduce((sum, seats) => sum + seats, 0),
    figures: (occupancy, hidden) => shown(hidden).reduce((sum, seats) => sum + figureCount(seats, occupancy), 0),
    onChange: (choice) => {
      last = choice;
      void audience.then((m) => m.setAudience(choice)).catch(report);
    },
    choice: () => last,
    built: audience.then(
      (m) => m.audienceLayers() > 0,
      () => false,
    ),
  };
}
