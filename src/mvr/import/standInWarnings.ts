import type { FixtureTypeId } from '../../domain/FixtureType';
import { TYPES } from '../../domain/fixtureTypes';
import { byCount } from '../byCount';
import type { MvrWarning } from '../MvrWarning';
import type { FixtureClass } from './classifyFixture';

/** How a fixture got its type when its GDTF could not give one. */
type How = 'name' | 'generic' | 'device';

interface Group {
  readonly spec: string;
  readonly how: How;
  readonly type: FixtureTypeId;
  /** The mode's channel count; kept only for `generic`, where the line names it. */
  readonly channels: number;
  readonly count: number;
  /** What says a `device` is no light. */
  readonly by: By;
}

type By = NonNullable<FixtureClass['deviceBy']>;

const DEVICE_REASONS: Readonly<Record<By, string>> = {
  'custom-id': 'the file marks it as not a light (CustomIdType)',
  gdtf: 'the GDTF has no beam and no light channel, so it is not a light',
  name: 'the name says it is not a light, and the GDTF is a placeholder',
};

/** One sentence per group; every one says the fixtures are kept, because before they vanished without a word. */
function line({ spec, how, type, channels, count, by }: Group): MvrWarning {
  const head = `${count} ${byCount(count, 'fixture', 'fixtures')} of "${spec}"`;
  const shown = `"${TYPES[type].name}"`;
  if (how === 'device') {
    const kept = byCount(count, 'it stays a fixture', 'they stay fixtures');
    const dark = byCount(count, 'emits', 'emit');
    const message = `${head}: ${DEVICE_REASONS[by]}; ${kept} with id and patch, shown as ${shown}, and ${dark} no light.`;
    return { code: 'non-light-fixture', message, ref: spec };
  }
  const basis =
    how === 'name'
      ? `the type comes from the fixture name (${shown})`
      : `a generic ${channels > 0 ? `${channels}-channel ` : ''}type is used (${shown})`;
  return { code: 'placeholder-gdtf', message: `${head}: the GDTF is a placeholder; ${basis}.`, ref: spec };
}

/**
 * Counts the fixtures whose GDTF did not type them as a light (`FixtureClass.standIn`), grouped by GDTF, cause and
 * desk type, so a show with a hundred placeholder GDTFs gives a few lines whose counts add up to those fixtures. The
 * user must see each group: the type is a guess, and a console that reads the export gets the same placeholder.
 */
export class StandInTally {
  private readonly groups = new Map<string, Group>();

  /** Counts one fixture; a fixture typed by its GDTF (`standIn` absent) is not counted. */
  add(spec: string, kind: FixtureClass, channelCount: number): void {
    if (kind.standIn === undefined) return;
    const guess: How = kind.fromName ? 'name' : 'generic';
    const how: How = kind.standIn === 'device' ? 'device' : guess;
    const channels = how === 'generic' ? channelCount : 0;
    const by = kind.deviceBy ?? 'gdtf';
    const key = [spec, how, kind.type, channels, by].join('\n');
    const group = this.groups.get(key) ?? { spec, how, type: kind.type, channels, count: 0, by };
    this.groups.set(key, { ...group, count: group.count + 1 });
  }

  /** The lines in the order their first fixture appears in the scene. */
  warnings(): MvrWarning[] {
    return [...this.groups.values()].map(line);
  }
}
