import { he } from '../../../src/i18n/he';

/** Areas added after the refactor: their text is new, so the legacy page cannot be its source of truth. */
const NEW_AREAS: ReadonlySet<string> = new Set(['builder', 'mvr']);

/**
 * The `he` areas that came from the legacy page. The legacy-parity tests check these only; a new feature area (the stage
 * builder, the MVR import) has no legacy text to match.
 */
export const legacyAreas: Readonly<Record<string, unknown>> = Object.fromEntries(
  Object.entries(he).filter(([area]) => !NEW_AREAS.has(area)),
);
