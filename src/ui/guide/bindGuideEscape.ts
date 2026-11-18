import type { Guide } from './Guide';
import type { Tour } from './Tour';

/**
 * Escape ends the tour and closes the guide. It must stay a capture listener on `document`: capture on `document` runs
 * before the command line's own handler and the page keyboard's bubble listener whatever the registration order, so
 * the page keyboard then sees neither open and also cancels STORE (known quirk Q7, orig:2887). Order matters only
 * against the other `document` capture listener, fullscreen F, and the two never act on the same key, so any order
 * is safe.
 */
export function bindGuideEscape(guide: Guide, tour: Tour): void {
  document.addEventListener(
    'keydown',
    (ev) => {
      if (ev.key === 'Escape') {
        if (tour.isActive()) tour.end();
        if (guide.isOpen()) guide.close();
      }
    },
    true,
  );
}
