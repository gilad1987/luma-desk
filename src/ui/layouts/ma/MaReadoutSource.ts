import type { AttrName } from '../../../domain/attributes';
import type { Fixture } from '../../../domain/Fixture';

/** What the MA touch screens read: the selected fixtures and the value each shows (programmer value, else base). */
export interface MaReadoutSource {
  selectedIds(): readonly number[];
  fixture(id: number): Fixture;
  value(fixture: Fixture, attr: AttrName): number;
}
