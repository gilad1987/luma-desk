import type { FixtureTypeId } from '../../domain/FixtureType';

/**
 * Product names and the desk type of each, for a fixture whose GDTF is a placeholder or missing and whose name has no
 * word such as "wash" or "beam". Only names that belong to one kind of fixture are listed; a family with spot, wash
 * and beam members (Maverick, Rogue, Axcor, impression) is left to its own word. Names are lower-case words, as
 * `wordsOf` splits them: digits split too, so "Tetra2" is `tetra` and "ALC4" is `alc`. A name of two words needs
 * both (`mac viper`), because the second word alone names other things: the "Viper" of another maker is a fog machine.
 */
export const PRODUCT_TYPES: readonly (readonly [product: string, type: FixtureTypeId])[] = [
  // Robe
  ...([
    ['megapointe', 'beam'],
    ['pointe', 'beam'],
    ['forte', 'spot'],
    ['esprite', 'spot'],
    ['bmfl', 'spot'],
  ] as const),
  ...([
    ['painte', 'spot'],
    ['spiider', 'wash'],
    ['tarrantula', 'wash'],
    ['tetra', 'bar'],
  ] as const),
  // Martin
  ...([
    ['mac viper', 'spot'],
    ['mac encore', 'spot'],
    ['mac aura', 'wash'],
    ['atomic', 'strobe'],
  ] as const),
  // Clay Paky
  ...([
    ['sharpy', 'beam'],
    ['mythos', 'spot'],
    ['scenius', 'spot'],
  ] as const),
  // Ayrton
  ...([
    ['khamsin', 'spot'],
    ['ghibli', 'spot'],
    ['perseo', 'spot'],
    ['diablo', 'spot'],
    ['huracan', 'spot'],
  ] as const),
  ...([
    ['domino', 'spot'],
    ['mistral', 'spot'],
    ['cobra', 'beam'],
    ['karif', 'beam'],
    ['zonda', 'wash'],
  ] as const),
  ...([['bora', 'wash']] as const),
  // GLP, Chauvet, ETC, Elation, ADB
  ...([
    ['jdc', 'strobe'],
    ['strike', 'blinder'],
    ['lustr', 'profile'],
  ] as const),
  ...([
    ['chorus', 'bar'],
    ['alc', 'wash'], // ADB ALC4: an LED cyclorama and soft light, a flood, not a pixel bar
  ] as const),
];

/**
 * The name without the revision that GDTF Share file names carry and Capture keeps (`Robe@Robin MegaPointe@r3038.gdtf`),
 * so the product is the last part of the name for every lookup.
 */
export function stripRevision(name: string): string {
  return name.replace(/@r\d+(\.gdtf)?$/i, '');
}
