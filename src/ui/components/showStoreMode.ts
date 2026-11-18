import type { EngineBus } from '../../engine/events';
import { byId } from '../dom';

/**
 * Reflects store mode on the page: the lit `#kStore` key and the `storing` body class that outlines the slots a
 * click would record into. The engine owns the flag; this is only its view. Returns the unsubscribe function.
 */
export function showStoreMode(bus: EngineBus): () => void {
  const storeKey = byId('kStore');
  return bus.on('storeModeChanged', ({ on }) => {
    storeKey.classList.toggle('on', on);
    document.body.classList.toggle('storing', on);
  });
}
