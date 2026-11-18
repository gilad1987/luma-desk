import type { TemplateId } from '../../domain/stage/templates';
import { TEMPLATE_IDS } from '../../domain/stage/templates';
import { VENUE_KINDS, type VenueKind } from '../../domain/stage/types';
import { he } from '../../i18n/he';

/** The English label and the Hebrew help line of one start card. */
interface CardText {
  readonly label: string;
  readonly help: string;
}

const TEMPLATE_CARDS: Readonly<Record<TemplateId, CardText>> = {
  empty: { label: 'Empty stage', help: he.builder.templates.empty },
  theatre: { label: 'Theatre', help: he.builder.templates.theatre },
  festival: { label: 'Festival', help: he.builder.templates.festival },
  'sultans-pool': { label: "Current Sultan's Pool rig", help: he.builder.templates.sultansPool },
};

const VENUE_CARDS: Readonly<Record<VenueKind, CardText>> = {
  'sultans-pool': { label: "Sultan's Pool", help: he.builder.venues.sultansPool },
  'black-box': { label: 'Black box', help: he.builder.venues.blackBox },
  'open-field': { label: 'Open field', help: he.builder.venues.openField },
};

/** Step 1 of the start screen: one card per template, in `TEMPLATE_IDS` order. */
export const templateCardsMarkup = step(
  'Choose a start',
  he.builder.start.templateHelp,
  TEMPLATE_IDS.map((id) => card('template', id, TEMPLATE_CARDS[id])),
);

/** Step 2 of the start screen: one card per venue, in `VENUE_KINDS` order. */
export const venueCardsMarkup = step(
  'Choose a venue',
  he.builder.start.venueHelp,
  VENUE_KINDS.map((kind) => card('venue', kind, VENUE_CARDS[kind])),
);

function step(title: string, help: string, cards: readonly string[]): string {
  return `<h2>${title}</h2><p class="start-help" dir="rtl">${help}</p><div class="start-cards">${cards.join('')}</div>`;
}

function card(kind: 'template' | 'venue', id: string, text: CardText): string {
  return `<button class="start-card" data-${kind}="${id}"><b>${text.label}</b><small dir="rtl">${text.help}</small></button>`;
}
