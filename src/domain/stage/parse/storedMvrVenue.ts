import type { StageDesign } from '../StageDesign';

/**
 * The venue a stored design loads with. MVR imports saved before the `mvr` venue existed stored Sultan's Pool with
 * every scenery part off; they load in the `mvr` venue, so a reload does not stand the imported set among terraces
 * and a back wall. Only that exact shape moves: an import the user put back in a venue with a part on keeps its venue.
 */
export function storedMvrVenue(design: Pick<StageDesign, 'source' | 'venue' | 'scenery'>): StageDesign['venue'] {
  const { source, venue, scenery } = design;
  const isOldImport = source.kind === 'mvr' && venue.kind === 'sultans-pool';
  if (!isOldImport || Object.values(scenery).some((isOn) => isOn)) return venue;
  return { ...venue, kind: 'mvr' };
}
