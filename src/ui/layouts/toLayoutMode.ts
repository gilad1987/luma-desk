import type { LayoutMode } from '../panels/layoutMode';

/** The layout a saved or selected name shows: anything but the two consoles shows the classic page, as before. */
export const toLayoutMode = (name: string): LayoutMode => (name === 'ma' || name === 'desk' ? name : 'classic');
