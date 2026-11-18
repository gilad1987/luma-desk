import { readFileSync } from 'node:fs';
import { goldenPath } from './goldenPath';

/**
 * Reads a recorded golden. A spec may take expected data from another golden (the demo groups, for example), so the
 * value is checked in one place instead of copied into the spec.
 */
export const readGolden = (name: string): unknown => JSON.parse(readFileSync(goldenPath(name), 'utf8')) as unknown;
