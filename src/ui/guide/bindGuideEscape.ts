import type { Guide } from './Guide';
import type { Tour } from './Tour';

/**
 * Escape ends the tour and closes the guide. It listens in the capture phase, so it runs before the global bubble
 * handler, which then sees neither open and also cancels STORE (known quirk Q7). Register after the global handler.
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
