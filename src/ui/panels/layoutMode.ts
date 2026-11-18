/**
 * The console layout as panels see it. Panels read it through a getter at call time, never by importing the layouts,
 * because the layouts own and change it.
 */
export type LayoutMode = 'ma' | 'desk' | 'classic';
