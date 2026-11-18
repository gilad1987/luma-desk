import type { StageDesign } from '../../StageDesign';
import { sultansPool } from './index';

/**
 * The built-in stage design, built once. main.ts passes this one object as `StageService.builtIn`, and `isBuiltIn`
 * compares designs by identity, so every module that needs the built-in stage reads this object instead of building
 * its own copy (an equal copy would not count as built-in).
 */
export const BUILT_IN_DESIGN: StageDesign = sultansPool();
