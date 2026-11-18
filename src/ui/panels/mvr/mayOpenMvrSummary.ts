import type { Modal } from '../../shared';

/**
 * Whether the import summary may take the shared modal. It may replace the Show File dialog the file was picked
 * from, but not another dialog the user opened while the file loaded, which would lose what the user was doing
 * there. `#fMvrFile` exists only in the Show File markup, and a closed modal shows nothing, whatever markup it keeps.
 */
export function mayOpenMvrSummary(modal: Pick<Modal, 'isOpen'>): boolean {
  return !modal.isOpen() || document.getElementById('fMvrFile') !== null;
}
