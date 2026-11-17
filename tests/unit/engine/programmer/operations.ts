import type { Rand } from './randomInputs';
import type { Worlds } from './worlds';
import { EDIT_STEPS } from './editSteps';
import { FLOW_STEPS } from './flowSteps';

/** One step on both worlds: a label for the failure trail, then what each side returned, so queries compare too. */
export type Step = (w: Worlds, r: Rand) => [string, unknown, unknown];

/** The operation table the parity suite draws from. */
export const STEPS: Record<string, Step> = { ...EDIT_STEPS, ...FLOW_STEPS };
