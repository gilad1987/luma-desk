import { setSceneryPart, setVenue } from '../../domain/stage/edit/deckOps';
import type { StageDesign } from '../../domain/stage/StageDesign';
import {
  BUILDER_VENUE_KINDS,
  SCENERY_PARTS,
  VENUE_KINDS,
  type SceneryPart,
  type VenueKind,
} from '../../domain/stage/types';
import { he } from '../../i18n/he';
import type { RunEdit } from './ErrorText';
import { makeCheckbox } from './checkbox';
import { makeHeading, makeSelect, oneOf } from './formControls';

const VENUE_NAMES: Readonly<Record<VenueKind, string>> = {
  'sultans-pool': "Sultan's Pool",
  'black-box': 'Black box',
  'open-field': 'Open field',
  mvr: 'Imported stage (MVR)',
};

/** The venues the picker lists: the builder venues, plus the design's own venue when only an import makes it. */
const pickableVenues = (current: VenueKind): readonly VenueKind[] =>
  VENUE_KINDS.filter((kind) => kind === current || BUILDER_VENUE_KINDS.some((offered) => offered === kind));

const SCENERY_NAMES: Readonly<Record<SceneryPart, string>> = {
  deck: 'Deck',
  trusses: 'Trusses',
  band: 'Band',
  ledWall: 'LED wall',
  crowd: 'Crowd',
};

/**
 * The Venue and Scenery sections of the Stage tab. A venue change resets the scenery to that venue's defaults (see
 * `setVenue`), so the toggles below always show what the draft holds after it.
 */
export function venueControls(d: StageDesign, run: RunEdit): HTMLElement[] {
  const venue = makeSelect({
    label: 'Venue',
    title: he.builder.tools.venue,
    choices: pickableVenues(d.venue.kind).map((kind) => ({ value: kind, text: VENUE_NAMES[kind] })),
    value: d.venue.kind,
    onPick: (value) => run((draft) => setVenue(draft, oneOf(VENUE_KINDS, value))),
  });
  const parts = SCENERY_PARTS.map((part) =>
    makeCheckbox({
      label: SCENERY_NAMES[part],
      key: `scenery ${part}`,
      title: he.builder.tools.scenery,
      isOn: d.scenery[part],
      onToggle: (isOn) => run((draft) => setSceneryPart(draft, part, isOn)),
    }),
  );
  return [makeHeading('Venue'), venue, makeHeading('Scenery'), ...parts];
}
