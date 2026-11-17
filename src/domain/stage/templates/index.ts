import type { StageDesign } from '../StageDesign';
import { emptyStage } from './empty';
import { festivalStage } from './festival';
import { sultansPool } from './sultansPool';
import { theatreStage } from './theatre';

/** The built-in start designs of the builder; 'sultans-pool' is also the default rig of the app. */
export type TemplateId = 'empty' | 'theatre' | 'festival' | 'sultans-pool';

/** Every template id in start-screen order, so the UI lists them without a second hand-written list. */
export const TEMPLATE_IDS: readonly TemplateId[] = ['empty', 'theatre', 'festival', 'sultans-pool'];

const FACTORIES: Readonly<Record<TemplateId, () => StageDesign>> = {
  empty: emptyStage,
  theatre: theatreStage,
  festival: festivalStage,
  'sultans-pool': sultansPool,
};

/**
 * The design of one template. A factory per id, not a ready table, so the Sultan's Pool rig (405 fixtures) is only
 * built when someone asks for it. Designs are readonly, so returned designs may share nested data.
 */
export function createTemplate(id: TemplateId): StageDesign {
  return FACTORIES[id]();
}
