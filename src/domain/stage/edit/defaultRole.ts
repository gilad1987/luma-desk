import type { FixtureTypeId } from '../../FixtureType';
import type { StageTruss } from '../trussTypes';
import type { FixtureRole } from '../types';

/**
 * The role a new fixture gets, so default groups and Auto Show pick it up without the user setting a role. Special
 * types have a role of their own wherever they hang; a bar on the floor is a footlight; any other fixture takes the
 * role of its truss, or `floor` when it has no truss.
 */
export function defaultRole(type: FixtureTypeId, truss: StageTruss | null): FixtureRole {
  switch (type) {
    case 'blinder':
    case 'strobe':
    case 'follow':
    case 'profile':
    case 'screen':
      return type;
    case 'bar':
      return truss ? truss.role : 'footlight';
    case 'spot':
    case 'beam':
    case 'wash':
    case 'par':
      return truss ? truss.role : 'floor';
  }
}
