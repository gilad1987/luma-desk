/** The camera view buttons in bar order: view id (the `setView` name) and label. FOH is lit at load. */
export const VIEWS = [
  ['foh', 'FOH'],
  ['front', 'Front'],
  ['stage', 'On Stage'],
  ['top', 'Top'],
  ['side', 'Side'],
  ['crowd', 'Crowd'],
  ['band', 'Band'],
  ['orch', 'Orchestra'],
  ['ring', 'Ring'],
  ['wide', 'Wide'],
  ['aud', 'Audience'],
  ['drums', 'Drums'],
  ['valley', 'Old City'],
  ['walls', 'Walls'],
] as const;

/** One of the camera views. */
export type ViewName = (typeof VIEWS)[number][0];

/** The view buttons on one line, as the original page had them. */
export const viewButtons = VIEWS.map(
  ([view, label], i) => `<button data-view="${view}"${i === 0 ? ' class="on"' : ''}>${label}</button>`,
).join('');
