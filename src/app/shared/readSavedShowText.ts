import { STORAGE_KEYS } from '../../show';
import { browserStore } from './browserStore';

/**
 * The saved show text, read once before the engine is built so a saved stage can be the first rig. A browser that
 * blocks storage gives `null` (the built-in stage); the later show restore reports that failure as before.
 */
export function readSavedShowText(): string | null {
  try {
    return browserStore.getItem(STORAGE_KEYS.show);
  } catch {
    return null;
  }
}
