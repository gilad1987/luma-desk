import { join } from 'node:path';

/** Path of tests/golden/<name>.json; writers and readers of goldens must agree on it. */
export const goldenPath = (name: string): string => join(import.meta.dirname, '..', 'golden', `${name}.json`);
